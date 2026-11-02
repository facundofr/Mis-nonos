import {
  aliasedTable,
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  isNull,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import * as schema from "@/db/schema";
import type { Transaction } from "@/lib/db/client";

/*
 * Lecturas de novedades (dentro de withTenant: solo la residencia activa).
 * Las listas van de la más nueva a la más vieja, paginadas por cursor
 * (fecha de creación e id, 10.12).
 */

export type NoteView = "pendientes" | "todas";

export interface NoteListItem {
  id: string;
  residentId: string | null;
  residentFirstName: string | null;
  residentLastName: string | null;
  residentRoom: string | null;
  categoryName: string;
  content: string;
  version: number;
  followUp: boolean;
  resolvedAt: Date | null;
  shiftName: string | null;
  createdBy: string;
  authorName: string;
  createdAt: Date;
}

/** Cursor de la lista: "<fecha ISO>_<id>" de la última novedad mostrada. */
export function encodeCursor(item: Pick<NoteListItem, "createdAt" | "id">): string {
  return `${item.createdAt.toISOString()}_${item.id}`;
}

export function decodeCursor(value: string | undefined): { createdAt: Date; id: string } | null {
  const match = value ? /^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)_([0-9a-f-]{36})$/.exec(value) : null;
  if (!match) return null;
  const createdAt = new Date(match[1]!);
  return Number.isNaN(createdAt.getTime()) ? null : { createdAt, id: match[2]! };
}

const pending = and(
  eq(schema.residentNotes.followUp, true),
  isNull(schema.residentNotes.resolvedAt),
);

function selectNotes(tx: Transaction) {
  return tx
    .select({
      id: schema.residentNotes.id,
      residentId: schema.residentNotes.residentId,
      residentFirstName: schema.residents.firstName,
      residentLastName: schema.residents.lastName,
      residentRoom: schema.residents.roomLabel,
      categoryName: schema.noteCategories.name,
      content: schema.residentNotes.content,
      version: schema.residentNotes.version,
      followUp: schema.residentNotes.followUp,
      resolvedAt: schema.residentNotes.resolvedAt,
      shiftName: schema.shifts.name,
      createdBy: schema.residentNotes.createdBy,
      authorName: schema.users.name,
      createdAt: schema.residentNotes.createdAt,
    })
    .from(schema.residentNotes)
    .innerJoin(schema.noteCategories, eq(schema.noteCategories.id, schema.residentNotes.categoryId))
    .innerJoin(schema.users, eq(schema.users.id, schema.residentNotes.createdBy))
    .leftJoin(schema.residents, eq(schema.residents.id, schema.residentNotes.residentId))
    .leftJoin(schema.shifts, eq(schema.shifts.id, schema.residentNotes.shiftId));
}

export async function listNotes(
  tx: Transaction,
  options: {
    siteId: string;
    view?: NoteView;
    residentId?: string;
    categoryId?: string;
    /** Solo las creadas desde/antes de estas fechas (resumen del turno). */
    from?: Date;
    to?: Date;
    /** Seguimientos que estaban abiertos en ese momento (resumen del traspaso). */
    pendingAt?: Date;
    cursor?: { createdAt: Date; id: string } | null;
    limit?: number;
  },
): Promise<NoteListItem[]> {
  const filters: (SQL | undefined)[] = [
    eq(schema.residentNotes.siteId, options.siteId),
    options.view === "pendientes" ? pending : undefined,
    options.residentId ? eq(schema.residentNotes.residentId, options.residentId) : undefined,
    options.categoryId ? eq(schema.residentNotes.categoryId, options.categoryId) : undefined,
    options.from ? gte(schema.residentNotes.createdAt, options.from) : undefined,
    options.to ? lt(schema.residentNotes.createdAt, options.to) : undefined,
    options.pendingAt
      ? and(
          eq(schema.residentNotes.followUp, true),
          lte(schema.residentNotes.createdAt, options.pendingAt),
          or(
            isNull(schema.residentNotes.resolvedAt),
            gt(schema.residentNotes.resolvedAt, options.pendingAt),
          ),
        )
      : undefined,
    options.cursor
      ? sql`(${schema.residentNotes.createdAt}, ${schema.residentNotes.id}) < (${options.cursor.createdAt.toISOString()}::timestamptz, ${options.cursor.id}::uuid)`
      : undefined,
  ];
  return selectNotes(tx)
    .where(and(...filters))
    .orderBy(desc(schema.residentNotes.createdAt), desc(schema.residentNotes.id))
    .limit(options.limit ?? 30);
}

/** Seguimientos abiertos de la sede (Pendientes, traspaso e Inicio). */
export async function countPendingNotes(tx: Transaction, siteId: string): Promise<number> {
  const [row] = await tx
    .select({ value: count() })
    .from(schema.residentNotes)
    .where(and(eq(schema.residentNotes.siteId, siteId), pending));
  return row?.value ?? 0;
}

export interface NoteDetail extends NoteListItem {
  siteId: string;
  categoryId: string;
  shiftDate: string | null;
  updatedAt: Date;
  resolvedByName: string | null;
  resolutionNote: string | null;
  residentStatus: string | null;
}

export async function getNote(tx: Transaction, noteId: string): Promise<NoteDetail | null> {
  const resolver = aliasedTable(schema.users, "resolver");
  const [row] = await tx
    .select({
      id: schema.residentNotes.id,
      siteId: schema.residentNotes.siteId,
      residentId: schema.residentNotes.residentId,
      residentFirstName: schema.residents.firstName,
      residentLastName: schema.residents.lastName,
      residentRoom: schema.residents.roomLabel,
      residentStatus: schema.residents.status,
      categoryId: schema.residentNotes.categoryId,
      categoryName: schema.noteCategories.name,
      content: schema.residentNotes.content,
      version: schema.residentNotes.version,
      followUp: schema.residentNotes.followUp,
      resolvedAt: schema.residentNotes.resolvedAt,
      resolvedByName: resolver.name,
      resolutionNote: schema.residentNotes.resolutionNote,
      shiftName: schema.shifts.name,
      shiftDate: schema.residentNotes.shiftDate,
      createdBy: schema.residentNotes.createdBy,
      authorName: schema.users.name,
      createdAt: schema.residentNotes.createdAt,
      updatedAt: schema.residentNotes.updatedAt,
    })
    .from(schema.residentNotes)
    .innerJoin(schema.noteCategories, eq(schema.noteCategories.id, schema.residentNotes.categoryId))
    .innerJoin(schema.users, eq(schema.users.id, schema.residentNotes.createdBy))
    .leftJoin(resolver, eq(resolver.id, schema.residentNotes.resolvedBy))
    .leftJoin(schema.residents, eq(schema.residents.id, schema.residentNotes.residentId))
    .leftJoin(schema.shifts, eq(schema.shifts.id, schema.residentNotes.shiftId))
    .where(eq(schema.residentNotes.id, noteId));
  return row ?? null;
}

export interface NoteVersionItem {
  version: number;
  content: string;
  categoryName: string;
  followUp: boolean;
  editorName: string;
  editedAt: Date;
}

/** Todas las versiones, de la más nueva a la más vieja ("Ver cambios"). */
export function listNoteVersions(tx: Transaction, noteId: string): Promise<NoteVersionItem[]> {
  return tx
    .select({
      version: schema.noteVersions.version,
      content: schema.noteVersions.content,
      categoryName: schema.noteCategories.name,
      followUp: schema.noteVersions.followUp,
      editorName: schema.users.name,
      editedAt: schema.noteVersions.editedAt,
    })
    .from(schema.noteVersions)
    .innerJoin(schema.noteCategories, eq(schema.noteCategories.id, schema.noteVersions.categoryId))
    .innerJoin(schema.users, eq(schema.users.id, schema.noteVersions.editedBy))
    .where(eq(schema.noteVersions.noteId, noteId))
    .orderBy(desc(schema.noteVersions.version));
}

/** Categorías activas, en orden (para elegir al registrar). */
export function listActiveCategories(tx: Transaction) {
  return tx
    .select({ id: schema.noteCategories.id, name: schema.noteCategories.name })
    .from(schema.noteCategories)
    .where(eq(schema.noteCategories.active, true))
    .orderBy(asc(schema.noteCategories.position), asc(schema.noteCategories.name));
}

/** Seguimientos resueltos dentro de un período (resumen del traspaso). */
export async function countResolvedBetween(
  tx: Transaction,
  siteId: string,
  from: Date,
  to: Date,
): Promise<number> {
  const [row] = await tx
    .select({ value: count() })
    .from(schema.residentNotes)
    .where(
      and(
        eq(schema.residentNotes.siteId, siteId),
        gte(schema.residentNotes.resolvedAt, from),
        lt(schema.residentNotes.resolvedAt, to),
      ),
    );
  return row?.value ?? 0;
}
