import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";

import * as schema from "@/db/schema";
import { recordAudit } from "@/lib/audit";
import type { Transaction } from "@/lib/db/client";
import type { TenantContext } from "@/lib/db/tenant";
import { DomainError } from "@/lib/errors";

import { recentRecords } from "./queries";
import { isDuplicate, nextKind, sameToken, TOKEN_PATTERN, type AttendanceKind } from "./rules";

/*
 * Asistencia del personal (docs/decisions/0020). La hora es la del servidor
 * y cada persona registra solo la suya (también lo exige RLS). El código del
 * QR nunca va a los logs ni a la auditoría.
 */

export const INVALID_TOKEN_MESSAGE = "Este código ya no vale: pedí el QR actualizado.";

/** La sede del código, si el código es el vigente. */
async function siteForToken(
  tx: Transaction,
  siteId: string,
  token: string,
): Promise<{ id: string } | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const [site] = await tx
    .select({
      id: schema.sites.id,
      token: schema.sites.attendanceToken,
      status: schema.sites.status,
    })
    .from(schema.sites)
    .where(eq(schema.sites.id, siteId));
  if (!site || site.status !== "active" || !sameToken(site.token, token)) return null;
  return { id: site.id };
}

/** ¿El código del enlace es el vigente para esta sede? */
export async function isValidAttendanceToken(
  tx: Transaction,
  siteId: string,
  token: string,
): Promise<boolean> {
  return (await siteForToken(tx, siteId, token)) !== null;
}

/**
 * Registra la entrada o la salida, según el último registro. Un doble toque
 * (lo mismo hace menos de 2 minutos) no se repite.
 */
export async function recordAttendance(
  tx: Transaction,
  actor: TenantContext,
  input: { siteId: string; token: string },
  now = new Date(),
): Promise<{ kind: AttendanceKind; occurredAt: Date }> {
  const site = await siteForToken(tx, input.siteId, input.token);
  if (!site) throw new DomainError(INVALID_TOKEN_MESSAGE);

  const [last] = await recentRecords(tx, { siteId: site.id, userId: actor.userId });
  // Un segundo toque enseguida (o una recarga) no cambia de entrada a salida:
  // devuelve lo que ya quedó registrado.
  if (last && isDuplicate(last, last.kind, now)) {
    return { kind: last.kind, occurredAt: last.occurredAt };
  }
  const kind = nextKind(last ?? null, now);

  const [row] = await tx
    .insert(schema.attendanceRecords)
    .values({ organizationId: actor.organizationId, siteId: site.id, userId: actor.userId, kind })
    .returning({
      id: schema.attendanceRecords.id,
      occurredAt: schema.attendanceRecords.occurredAt,
    });
  await recordAudit(tx, actor, {
    action: kind === "in" ? "attendance.in" : "attendance.out",
    entityType: "attendance_record",
    entityId: row!.id,
    siteId: site.id,
  });
  return { kind, occurredAt: row!.occurredAt };
}

/** Código nuevo para el QR: el impreso deja de funcionar. */
export async function rotateAttendanceToken(
  tx: Transaction,
  actor: TenantContext,
  siteId: string,
): Promise<void> {
  const [site] = await tx
    .update(schema.sites)
    .set({ attendanceToken: randomBytes(32).toString("hex"), updatedAt: new Date() })
    .where(eq(schema.sites.id, siteId))
    .returning({ id: schema.sites.id });
  if (!site) throw new DomainError("No encontramos la sede.");
  await recordAudit(tx, actor, {
    action: "attendance.token_rotated",
    entityType: "site",
    entityId: site.id,
    siteId: site.id,
  });
}
