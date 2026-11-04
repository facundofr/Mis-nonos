import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";

import * as schema from "@/db/schema";
import { roleLabel } from "@/lib/auth/role-label";
import type { Transaction } from "@/lib/db/client";

import { OPEN_ENTRY_MAX_MS, type AttendanceKind, type AttendanceMark } from "./rules";

/*
 * Consultas de la asistencia (docs/decisions/0020). RLS deja ver a cada
 * persona lo suyo y, con attendance.read, lo de todos.
 */

export interface AttendanceRow extends AttendanceMark {
  id: string;
}

/** Los últimos registros de una persona en la sede, del más nuevo al más viejo. */
export async function recentRecords(
  tx: Transaction,
  options: { siteId: string; userId: string; limit?: number },
): Promise<AttendanceRow[]> {
  const rows = await tx
    .select({
      id: schema.attendanceRecords.id,
      kind: schema.attendanceRecords.kind,
      occurredAt: schema.attendanceRecords.occurredAt,
    })
    .from(schema.attendanceRecords)
    .where(
      and(
        eq(schema.attendanceRecords.siteId, options.siteId),
        eq(schema.attendanceRecords.userId, options.userId),
      ),
    )
    .orderBy(desc(schema.attendanceRecords.occurredAt), desc(schema.attendanceRecords.id))
    .limit(options.limit ?? 1);
  return rows.map((row) => ({ ...row, kind: row.kind as AttendanceKind }));
}

export interface PresentRow {
  userId: string;
  name: string;
  roleName: string;
  enteredAt: Date;
}

/**
 * Quiénes están en la residencia: su último registro es una entrada de hace
 * menos de 36 h. Solo personas activas de la residencia.
 */
export async function presentNow(
  tx: Transaction,
  siteId: string,
  now = new Date(),
): Promise<PresentRow[]> {
  const since = new Date(now.getTime() - OPEN_ENTRY_MAX_MS);
  const last = tx
    .selectDistinctOn([schema.attendanceRecords.userId], {
      userId: schema.attendanceRecords.userId,
      kind: schema.attendanceRecords.kind,
      occurredAt: schema.attendanceRecords.occurredAt,
    })
    .from(schema.attendanceRecords)
    .where(
      and(
        eq(schema.attendanceRecords.siteId, siteId),
        sql`${schema.attendanceRecords.occurredAt} > ${since.toISOString()}`,
      ),
    )
    .orderBy(
      schema.attendanceRecords.userId,
      desc(schema.attendanceRecords.occurredAt),
      desc(schema.attendanceRecords.id),
    )
    .as("last");
  const rows = await tx
    .select({
      userId: last.userId,
      name: schema.users.name,
      roleName: roleLabel,
      enteredAt: last.occurredAt,
    })
    .from(last)
    .innerJoin(schema.users, eq(schema.users.id, last.userId))
    .innerJoin(
      schema.organizationMemberships,
      and(
        eq(schema.organizationMemberships.userId, last.userId),
        eq(schema.organizationMemberships.organizationId, sql`(select app.current_org_id())`),
        eq(schema.organizationMemberships.status, "active"),
      ),
    )
    .innerJoin(schema.roles, eq(schema.roles.id, schema.organizationMemberships.roleId))
    .where(eq(last.kind, "in"))
    .orderBy(last.occurredAt);
  return rows.map((row) => ({ ...row, enteredAt: new Date(row.enteredAt) }));
}

export interface BoardRow {
  userId: string;
  name: string;
  roleName: string;
  /** Último registro de los últimos días (o nada). */
  last: AttendanceMark | null;
}

/**
 * Tablero de fichaje: todo el personal activo de la residencia con su último
 * registro reciente. Necesita attendance.read (RLS).
 */
export async function attendanceBoard(
  tx: Transaction,
  siteId: string,
  now = new Date(),
): Promise<BoardRow[]> {
  const since = new Date(now.getTime() - 2 * OPEN_ENTRY_MAX_MS);
  const last = tx
    .selectDistinctOn([schema.attendanceRecords.userId], {
      userId: schema.attendanceRecords.userId,
      kind: schema.attendanceRecords.kind,
      occurredAt: schema.attendanceRecords.occurredAt,
    })
    .from(schema.attendanceRecords)
    .where(
      and(
        eq(schema.attendanceRecords.siteId, siteId),
        sql`${schema.attendanceRecords.occurredAt} > ${since.toISOString()}`,
      ),
    )
    .orderBy(
      schema.attendanceRecords.userId,
      desc(schema.attendanceRecords.occurredAt),
      desc(schema.attendanceRecords.id),
    )
    .as("last");
  const rows = await tx
    .select({
      userId: schema.users.id,
      name: schema.users.name,
      roleName: roleLabel,
      kind: last.kind,
      occurredAt: last.occurredAt,
    })
    .from(schema.organizationMemberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
    .innerJoin(schema.roles, eq(schema.roles.id, schema.organizationMemberships.roleId))
    .leftJoin(last, eq(last.userId, schema.organizationMemberships.userId))
    .where(
      and(
        eq(schema.organizationMemberships.organizationId, sql`(select app.current_org_id())`),
        eq(schema.organizationMemberships.status, "active"),
      ),
    )
    .orderBy(schema.users.name);
  return rows.map((row) => ({
    userId: row.userId,
    name: row.name,
    roleName: row.roleName,
    last:
      row.kind && row.occurredAt
        ? { kind: row.kind as AttendanceKind, occurredAt: new Date(row.occurredAt) }
        : null,
  }));
}

export interface AttendanceRecordRow {
  id: string;
  userId: string;
  name: string;
  kind: AttendanceKind;
  occurredAt: Date;
}

/**
 * Registros de la sede en un período (historial), del más viejo al más
 * nuevo. Con userId, solo los de esa persona. Necesita attendance.read para
 * ver los de otros (RLS).
 */
export async function recordsBetween(
  tx: Transaction,
  options: { siteId: string; from: Date; to: Date; userId?: string },
): Promise<AttendanceRecordRow[]> {
  const rows = await tx
    .select({
      id: schema.attendanceRecords.id,
      userId: schema.attendanceRecords.userId,
      name: schema.users.name,
      kind: schema.attendanceRecords.kind,
      occurredAt: schema.attendanceRecords.occurredAt,
    })
    .from(schema.attendanceRecords)
    .innerJoin(schema.users, eq(schema.users.id, schema.attendanceRecords.userId))
    .where(
      and(
        eq(schema.attendanceRecords.siteId, options.siteId),
        gte(schema.attendanceRecords.occurredAt, options.from),
        lt(schema.attendanceRecords.occurredAt, options.to),
        options.userId ? eq(schema.attendanceRecords.userId, options.userId) : undefined,
      ),
    )
    .orderBy(asc(schema.attendanceRecords.occurredAt), asc(schema.attendanceRecords.id));
  return rows.map((row) => ({ ...row, kind: row.kind as AttendanceKind }));
}

export interface StaffMember {
  userId: string;
  name: string;
  roleName: string;
  active: boolean;
}

/** Una persona de la residencia (también si está desactivada), para su historial. */
export async function getStaffMember(tx: Transaction, userId: string): Promise<StaffMember | null> {
  const [row] = await tx
    .select({
      userId: schema.users.id,
      name: schema.users.name,
      roleName: roleLabel,
      status: schema.organizationMemberships.status,
    })
    .from(schema.organizationMemberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
    .innerJoin(schema.roles, eq(schema.roles.id, schema.organizationMemberships.roleId))
    .where(
      and(
        eq(schema.organizationMemberships.organizationId, sql`(select app.current_org_id())`),
        eq(schema.organizationMemberships.userId, userId),
      ),
    );
  return row
    ? {
        userId: row.userId,
        name: row.name,
        roleName: row.roleName,
        active: row.status === "active",
      }
    : null;
}
