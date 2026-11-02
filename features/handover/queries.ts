import { aliasedTable, and, desc, eq, gte } from "drizzle-orm";

import * as schema from "@/db/schema";
import type { Transaction } from "@/lib/db/client";
import type { ShiftOccurrence } from "@/lib/time/shifts";

import { countResolvedBetween, listNotes, type NoteListItem } from "../notes/queries";
import { DELIVERY_CLOSES_AFTER_END_MS } from "./rules";

/* Lecturas del traspaso (dentro de withTenant: solo la residencia activa). */

export interface HandoverRow {
  id: string;
  note: string | null;
  version: number;
  deliveredByName: string;
  deliveredAt: Date;
  confirmedByName: string | null;
  confirmedAt: Date | null;
}

export async function getHandover(
  tx: Transaction,
  siteId: string,
  shiftId: string,
  shiftDate: string,
): Promise<HandoverRow | null> {
  const deliverer = aliasedTable(schema.users, "deliverer");
  const confirmer = aliasedTable(schema.users, "confirmer");
  const [row] = await tx
    .select({
      id: schema.shiftHandovers.id,
      note: schema.shiftHandovers.note,
      version: schema.shiftHandovers.version,
      deliveredByName: deliverer.name,
      deliveredAt: schema.shiftHandovers.deliveredAt,
      confirmedByName: confirmer.name,
      confirmedAt: schema.shiftHandovers.confirmedAt,
    })
    .from(schema.shiftHandovers)
    .innerJoin(deliverer, eq(deliverer.id, schema.shiftHandovers.deliveredBy))
    .leftJoin(confirmer, eq(confirmer.id, schema.shiftHandovers.confirmedBy))
    .where(
      and(
        eq(schema.shiftHandovers.siteId, siteId),
        eq(schema.shiftHandovers.shiftId, shiftId),
        eq(schema.shiftHandovers.shiftDate, shiftDate),
      ),
    );
  return row ?? null;
}

export function listHandoverVersions(tx: Transaction, handoverId: string) {
  return tx
    .select({
      version: schema.shiftHandoverVersions.version,
      note: schema.shiftHandoverVersions.note,
      deliveredByName: schema.users.name,
      deliveredAt: schema.shiftHandoverVersions.deliveredAt,
    })
    .from(schema.shiftHandoverVersions)
    .innerJoin(schema.users, eq(schema.users.id, schema.shiftHandoverVersions.deliveredBy))
    .where(eq(schema.shiftHandoverVersions.handoverId, handoverId))
    .orderBy(desc(schema.shiftHandoverVersions.version));
}

export interface HandoverSummary {
  /** Novedades creadas dentro del horario del turno. */
  notes: NoteListItem[];
  /** Seguimientos abiertos al momento de la entrega (o ahora, si no se entregó). */
  pending: NoteListItem[];
  resolvedCount: number;
  /** Momento al que corresponden los pendientes. */
  pendingAt: Date;
}

/** Resumen del turno (F.4): novedades del período y pendientes abiertos. */
export async function handoverSummary(
  tx: Transaction,
  siteId: string,
  occurrence: ShiftOccurrence,
  handover: Pick<HandoverRow, "deliveredAt"> | null,
  now: Date,
): Promise<HandoverSummary> {
  const closesAt = new Date(occurrence.endsAt.getTime() + DELIVERY_CLOSES_AFTER_END_MS);
  const pendingAt = handover?.deliveredAt ?? (now < closesAt ? now : occurrence.endsAt);
  const [notes, pending, resolvedCount] = [
    await listNotes(tx, {
      siteId,
      from: occurrence.startsAt,
      to: occurrence.endsAt,
      limit: 100,
    }),
    await listNotes(tx, { siteId, pendingAt, limit: 100 }),
    await countResolvedBetween(tx, siteId, occurrence.startsAt, occurrence.endsAt),
  ];
  return { notes, pending, resolvedCount, pendingAt };
}

/** Entregas de la sede desde una fecha (historial). */
export function listHandoversSince(tx: Transaction, siteId: string, fromDate: string) {
  const deliverer = aliasedTable(schema.users, "deliverer");
  return tx
    .select({
      shiftId: schema.shiftHandovers.shiftId,
      shiftDate: schema.shiftHandovers.shiftDate,
      deliveredByName: deliverer.name,
      deliveredAt: schema.shiftHandovers.deliveredAt,
      confirmedAt: schema.shiftHandovers.confirmedAt,
    })
    .from(schema.shiftHandovers)
    .innerJoin(deliverer, eq(deliverer.id, schema.shiftHandovers.deliveredBy))
    .where(
      and(eq(schema.shiftHandovers.siteId, siteId), gte(schema.shiftHandovers.shiftDate, fromDate)),
    );
}
