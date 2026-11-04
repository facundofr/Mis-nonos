import { and, asc, eq, max, ne, sql } from "drizzle-orm";

import * as schema from "@/db/schema";
import { diffChanges, recordAudit } from "@/lib/audit";
import type { Transaction } from "@/lib/db/client";
import type { TenantContext } from "@/lib/db/tenant";
import { DomainError } from "@/lib/errors";
import { formatTimeOfDay } from "@/lib/time/zoned";

import type { DocumentTypeInput, ShiftInput, SiteSettingsInput } from "./schemas";
import { shiftsOverlap } from "./shift-rules";

/*
 * Configuración de la residencia (F1-CFG-01, F1-CFG-02). Solo con
 * settings.manage (lo verifica la Server Action). Nada se borra: los
 * catálogos se desactivan. Cada cambio queda en la auditoría.
 */

export async function updateSiteSettings(
  tx: Transaction,
  actor: TenantContext,
  siteId: string,
  input: SiteSettingsInput,
): Promise<void> {
  const [before] = await tx.select().from(schema.sites).where(eq(schema.sites.id, siteId));
  if (!before) throw new DomainError("La sede no existe.");
  await tx.update(schema.sites).set(input).where(eq(schema.sites.id, siteId));
  const changes = diffChanges(before, { ...before, ...input }, Object.keys(input));
  if (changes) {
    await recordAudit(tx, actor, {
      action: "site.updated",
      entityType: "site",
      entityId: siteId,
      siteId,
      changes,
    });
  }
}

/** Alta o cambio de un turno. Los activos no pueden superponerse. */
export async function saveShift(
  tx: Transaction,
  actor: TenantContext,
  siteId: string,
  shiftId: string | null,
  input: ShiftInput,
): Promise<void> {
  if (input.active) {
    const others = await tx
      .select({
        name: schema.shifts.name,
        startsAt: schema.shifts.startsAt,
        endsAt: schema.shifts.endsAt,
      })
      .from(schema.shifts)
      .where(
        and(
          eq(schema.shifts.siteId, siteId),
          eq(schema.shifts.active, true),
          shiftId ? ne(schema.shifts.id, shiftId) : undefined,
        ),
      );
    const clash = others.find((other) => shiftsOverlap(other, input));
    if (clash) {
      throw new DomainError(
        `Se superpone con el turno ${clash.name} (${formatTimeOfDay(clash.startsAt)} a ${formatTimeOfDay(clash.endsAt)}).`,
        "startsAt",
      );
    }
  }

  const [duplicate] = await tx
    .select({ id: schema.shifts.id })
    .from(schema.shifts)
    .where(
      and(
        eq(schema.shifts.siteId, siteId),
        sql`lower(${schema.shifts.name}) = lower(${input.name})`,
        shiftId ? ne(schema.shifts.id, shiftId) : undefined,
      ),
    );
  if (duplicate) throw new DomainError("Ya hay un turno con ese nombre.", "name");

  if (shiftId) {
    const [before] = await tx
      .select()
      .from(schema.shifts)
      .where(and(eq(schema.shifts.id, shiftId), eq(schema.shifts.siteId, siteId)));
    if (!before) throw new DomainError("Ese turno no existe.");
    await tx.update(schema.shifts).set(input).where(eq(schema.shifts.id, shiftId));
    const changes = diffChanges(
      {
        ...before,
        startsAt: formatTimeOfDay(before.startsAt),
        endsAt: formatTimeOfDay(before.endsAt),
      },
      input,
      ["name", "startsAt", "endsAt", "active"],
    );
    if (changes) {
      await recordAudit(tx, actor, {
        action: "shift.updated",
        entityType: "shift",
        entityId: shiftId,
        siteId,
        changes,
      });
    }
  } else {
    const [created] = await tx
      .insert(schema.shifts)
      .values({ organizationId: actor.organizationId, siteId, ...input })
      .returning({ id: schema.shifts.id });
    await recordAudit(tx, actor, {
      action: "shift.created",
      entityType: "shift",
      entityId: created?.id,
      siteId,
      changes: diffChanges(null, input),
    });
  }

  // El orden de los turnos es el de su hora de inicio.
  const ordered = await tx
    .select({ id: schema.shifts.id })
    .from(schema.shifts)
    .where(eq(schema.shifts.siteId, siteId))
    .orderBy(asc(schema.shifts.startsAt));
  for (const [index, shift] of ordered.entries()) {
    await tx
      .update(schema.shifts)
      .set({ position: index + 1 })
      .where(eq(schema.shifts.id, shift.id));
  }
}

/** Clave estable a partir del nombre: "Credencial de obra social" → "credencial_de_obra_social". */
export function documentKeyFrom(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 34);
  return /^[a-z]/.test(slug) ? slug : `doc_${slug}`.slice(0, 34);
}

export async function saveDocumentType(
  tx: Transaction,
  actor: TenantContext,
  documentTypeId: string | null,
  input: DocumentTypeInput,
): Promise<void> {
  if (documentTypeId) {
    const [before] = await tx
      .select()
      .from(schema.documentTypes)
      .where(eq(schema.documentTypes.id, documentTypeId));
    if (!before) throw new DomainError("Ese documento no existe.");
    await tx
      .update(schema.documentTypes)
      .set(input)
      .where(eq(schema.documentTypes.id, documentTypeId));
    const changes = diffChanges(before, input, [
      "name",
      "description",
      "requiredFor",
      "required",
      "active",
    ]);
    if (changes) {
      await recordAudit(tx, actor, {
        action: "document_type.updated",
        entityType: "document_type",
        entityId: documentTypeId,
        changes,
      });
    }
    return;
  }

  const base = documentKeyFrom(input.name);
  const existing = await tx
    .select({ key: schema.documentTypes.key })
    .from(schema.documentTypes)
    .where(sql`${schema.documentTypes.key} like ${`${base}%`}`);
  const keys = new Set(existing.map((row) => row.key));
  let key = base.length >= 2 ? base : `doc_${base}`;
  for (let suffix = 2; keys.has(key); suffix += 1) key = `${base}_${suffix}`;

  const [last] = await tx
    .select({ value: max(schema.documentTypes.position) })
    .from(schema.documentTypes);
  const [created] = await tx
    .insert(schema.documentTypes)
    .values({
      organizationId: actor.organizationId,
      key,
      ...input,
      position: (last?.value ?? 0) + 1,
    })
    .returning({ id: schema.documentTypes.id });
  await recordAudit(tx, actor, {
    action: "document_type.created",
    entityType: "document_type",
    entityId: created?.id,
    changes: diffChanges(null, { key, ...input }),
  });
}

/** Sube o baja un documento del legajo en la lista. */
export async function moveDocumentType(
  tx: Transaction,
  actor: TenantContext,
  itemId: string,
  direction: "up" | "down",
): Promise<void> {
  const table = schema.documentTypes;
  const items = await tx
    .select({ id: table.id, position: table.position })
    .from(table)
    .orderBy(asc(table.position), asc(table.createdAt));
  const index = items.findIndex((item) => item.id === itemId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= items.length) return;
  const reordered = items.slice();
  [reordered[index], reordered[swapWith]] = [reordered[swapWith]!, reordered[index]!];
  for (const [position, item] of reordered.entries()) {
    await tx
      .update(table)
      .set({ position: position + 1 })
      .where(eq(table.id, item.id));
  }
  await recordAudit(tx, actor, {
    action: "document_type.reordered",
    entityType: "document_type",
    entityId: itemId,
    metadata: { direccion: direction === "up" ? "arriba" : "abajo" },
  });
}
