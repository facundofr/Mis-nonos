import { and, eq, isNull, sql } from "drizzle-orm";

import * as schema from "@/db/schema";
import { diffChanges, recordAudit } from "@/lib/audit";
import type { Transaction } from "@/lib/db/client";
import type { TenantContext } from "@/lib/db/tenant";
import { CONCURRENT_CHANGE_MESSAGE, DomainError } from "@/lib/errors";
import { currentShift } from "@/lib/time/shifts";

import { EDIT_WINDOW_HOURS, type NoteInput, type ResolveInput } from "./schemas";

/*
 * Reglas de las novedades (7.3-F, F.4, confirmadas el 01/11/2026):
 * - se registran sobre un paciente activo o internado fuera, o "General";
 * - solo el autor corrige, hasta 24 h después; cada corrección es una
 *   versión nueva y la anterior se conserva;
 * - resuelve cualquiera con notes.resolve; el comentario es opcional.
 * Los permisos los verifica la Server Action. La auditoría no copia el
 * texto (ya queda en note_versions): registra qué cambió y quién.
 */

async function categoryName(tx: Transaction, categoryId: string, activeOnly: boolean) {
  const [category] = await tx
    .select({ name: schema.noteCategories.name, active: schema.noteCategories.active })
    .from(schema.noteCategories)
    .where(eq(schema.noteCategories.id, categoryId));
  if (!category || (activeOnly && !category.active)) {
    throw new DomainError("Elegí una categoría.", "categoryId");
  }
  return category.name;
}

export async function createNote(
  tx: Transaction,
  actor: TenantContext,
  input: NoteInput & { residentId: string | null; siteId: string },
  now = new Date(),
): Promise<string> {
  let siteId = input.siteId;
  if (input.residentId) {
    const [resident] = await tx
      .select({ status: schema.residents.status, siteId: schema.residents.siteId })
      .from(schema.residents)
      .where(eq(schema.residents.id, input.residentId));
    if (!resident || !["active", "hospitalized"].includes(resident.status)) {
      throw new DomainError("Ese paciente no está activo: no se le pueden registrar novedades.");
    }
    siteId = resident.siteId;
  }
  const category = await categoryName(tx, input.categoryId, true);

  // Turno en que se registra, según el reloj de la sede (F.4).
  const [site] = await tx
    .select({ timezone: schema.sites.timezone })
    .from(schema.sites)
    .where(eq(schema.sites.id, siteId));
  if (!site) throw new DomainError("La sede no existe.");
  const siteShifts = await tx.select().from(schema.shifts).where(eq(schema.shifts.siteId, siteId));
  const shift = currentShift(siteShifts, now, site.timezone);

  const [note] = await tx
    .insert(schema.residentNotes)
    .values({
      organizationId: actor.organizationId,
      siteId,
      residentId: input.residentId,
      categoryId: input.categoryId,
      content: input.content,
      followUp: input.followUp,
      shiftId: shift?.shift.id ?? null,
      shiftDate: shift?.shiftDate ?? null,
      createdBy: actor.userId,
    })
    .returning({ id: schema.residentNotes.id });
  const noteId = note!.id;
  await tx.insert(schema.noteVersions).values({
    organizationId: actor.organizationId,
    noteId,
    version: 1,
    content: input.content,
    categoryId: input.categoryId,
    followUp: input.followUp,
    editedBy: actor.userId,
  });
  await recordAudit(tx, actor, {
    action: "note.created",
    entityType: "note",
    entityId: noteId,
    siteId,
    changes: diffChanges(null, { category: category, followUp: input.followUp }),
    metadata: { residentId: input.residentId },
  });
  return noteId;
}

/** Corrección del autor (F.4): nueva versión, hasta 24 h después de crearla. */
export async function correctNote(
  tx: Transaction,
  actor: TenantContext,
  noteId: string,
  expectedVersion: number,
  input: NoteInput,
): Promise<void> {
  const [current] = await tx
    .select()
    .from(schema.residentNotes)
    .where(eq(schema.residentNotes.id, noteId));
  if (!current) throw new DomainError("Esa novedad no existe.");
  if (current.createdBy !== actor.userId) {
    throw new DomainError("Solo quien registró la novedad puede corregirla.");
  }
  if (current.resolvedAt)
    throw new DomainError("La novedad ya está resuelta: no se puede corregir.");
  if (
    current.content === input.content &&
    current.categoryId === input.categoryId &&
    current.followUp === input.followUp
  ) {
    throw new DomainError("No hay cambios para guardar.");
  }
  const previousCategory = await categoryName(tx, current.categoryId, false);
  const nextCategory =
    input.categoryId === current.categoryId
      ? previousCategory
      : await categoryName(tx, input.categoryId, true);

  const nextVersion = expectedVersion + 1;
  // La base controla el plazo y la versión (sin depender del reloj del servidor de la app).
  const updated = await tx
    .update(schema.residentNotes)
    .set({
      content: input.content,
      categoryId: input.categoryId,
      followUp: input.followUp,
      version: nextVersion,
    })
    .where(
      and(
        eq(schema.residentNotes.id, noteId),
        eq(schema.residentNotes.version, expectedVersion),
        eq(schema.residentNotes.createdBy, actor.userId),
        isNull(schema.residentNotes.resolvedAt),
        sql`${schema.residentNotes.createdAt} > now() - make_interval(hours => ${EDIT_WINDOW_HOURS})`,
      ),
    )
    .returning({ id: schema.residentNotes.id });
  if (updated.length === 0) {
    if (current.version !== expectedVersion) throw new DomainError(CONCURRENT_CHANGE_MESSAGE);
    throw new DomainError(
      `Pasaron más de ${EDIT_WINDOW_HOURS} h desde que se registró: ya no se puede corregir. Registrá una novedad nueva.`,
    );
  }
  await tx.insert(schema.noteVersions).values({
    organizationId: actor.organizationId,
    noteId,
    version: nextVersion,
    content: input.content,
    categoryId: input.categoryId,
    followUp: input.followUp,
    editedBy: actor.userId,
  });
  await recordAudit(tx, actor, {
    action: "note.corrected",
    entityType: "note",
    entityId: noteId,
    siteId: current.siteId,
    changes: diffChanges(
      { category: previousCategory, followUp: current.followUp },
      { category: nextCategory, followUp: input.followUp },
    ),
    metadata: {
      residentId: current.residentId,
      version: nextVersion,
      textChanged: current.content !== input.content,
    },
  });
}

/** Resolver un seguimiento (F.4): quién, cuándo y un comentario opcional. */
export async function resolveNote(
  tx: Transaction,
  actor: TenantContext,
  noteId: string,
  input: ResolveInput,
): Promise<void> {
  const resolved = await tx
    .update(schema.residentNotes)
    .set({
      resolvedAt: sql`now()`,
      resolvedBy: actor.userId,
      resolutionNote: input.resolutionNote,
    })
    .where(
      and(
        eq(schema.residentNotes.id, noteId),
        eq(schema.residentNotes.followUp, true),
        isNull(schema.residentNotes.resolvedAt),
      ),
    )
    .returning({
      siteId: schema.residentNotes.siteId,
      residentId: schema.residentNotes.residentId,
    });
  if (resolved.length === 0) {
    const [note] = await tx
      .select({ followUp: schema.residentNotes.followUp })
      .from(schema.residentNotes)
      .where(eq(schema.residentNotes.id, noteId));
    if (!note) throw new DomainError("Esa novedad no existe.");
    if (!note.followUp) throw new DomainError("Esa novedad no pide seguimiento.");
    throw new DomainError("Ese seguimiento ya estaba resuelto.");
  }
  await recordAudit(tx, actor, {
    action: "note.resolved",
    entityType: "note",
    entityId: noteId,
    siteId: resolved[0]!.siteId,
    changes: null,
    metadata: { residentId: resolved[0]!.residentId, withComment: input.resolutionNote !== null },
  });
}
