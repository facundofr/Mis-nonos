import { and, asc, eq, isNull, sql, type SQL } from "drizzle-orm";

import * as schema from "@/db/schema";
import { canReceiveEmail } from "@/lib/auth/identifiers";
import type { Transaction } from "@/lib/db/client";

/*
 * Personas de la residencia: membresías (perfil básico de empleado, 7.3-A)
 * e invitaciones pendientes. Dentro de withTenant: RLS limita todo a la
 * residencia activa.
 */

export type MemberStatus = "active" | "invited" | "disabled";

export interface MemberRow {
  membershipId: string;
  userId: string;
  name: string;
  /** null si la persona entra con usuario (sin email, DC-11). */
  email: string | null;
  username: string | null;
  roleId: string;
  roleKey: string;
  roleName: string;
  status: MemberStatus;
  phone: string | null;
  profession: string | null;
  licenseNumber: string | null;
  usualShiftId: string | null;
  usualShiftName: string | null;
  twoFactorEnabled: boolean;
}

const memberColumns = {
  membershipId: schema.organizationMemberships.id,
  userId: schema.users.id,
  name: schema.users.name,
  email: schema.users.email,
  username: schema.users.username,
  roleId: schema.roles.id,
  roleKey: schema.roles.key,
  roleName: schema.roles.name,
  status: schema.organizationMemberships.status,
  phone: schema.organizationMemberships.phone,
  profession: schema.organizationMemberships.profession,
  licenseNumber: schema.organizationMemberships.licenseNumber,
  usualShiftId: schema.organizationMemberships.usualShiftId,
  usualShiftName: schema.shifts.name,
  twoFactorEnabled: schema.users.twoFactorEnabled,
};

function toMember(row: {
  [K in keyof typeof memberColumns]: unknown;
}): MemberRow {
  const email = row.email as string;
  return {
    ...(row as unknown as MemberRow),
    email: canReceiveEmail(email) ? email : null,
    status: row.status as MemberStatus,
  };
}

/** Solo la residencia activa: RLS también deja ver las membresías propias en otras. */
const inCurrentOrganization = eq(
  schema.organizationMemberships.organizationId,
  sql`(select app.current_org_id())`,
);

function membersQuery(tx: Transaction, filter?: SQL) {
  return tx
    .select(memberColumns)
    .from(schema.organizationMemberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
    .innerJoin(schema.roles, eq(schema.roles.id, schema.organizationMemberships.roleId))
    .leftJoin(schema.shifts, eq(schema.shifts.id, schema.organizationMemberships.usualShiftId))
    .where(filter ? and(inCurrentOrganization, filter) : inCurrentOrganization);
}

/** Todas las personas de la residencia: primero las activas, por nombre. */
export async function listMembers(tx: Transaction): Promise<MemberRow[]> {
  const rows = await membersQuery(tx).orderBy(
    sql`case ${schema.organizationMemberships.status} when 'active' then 0 when 'invited' then 1 else 2 end`,
    asc(schema.users.name),
  );
  return rows.map(toMember);
}

export async function getMember(tx: Transaction, membershipId: string): Promise<MemberRow | null> {
  const [row] = await membersQuery(tx, eq(schema.organizationMemberships.id, membershipId));
  return row ? toMember(row) : null;
}

export interface PendingInvitation {
  id: string;
  name: string;
  email: string;
  roleName: string;
  expiresAt: Date;
  expired: boolean;
}

/** Invitaciones sin aceptar ni anular (las vencidas también: se pueden reenviar). */
export async function listPendingInvitations(
  tx: Transaction,
  now = new Date(),
): Promise<PendingInvitation[]> {
  const rows = await tx
    .select({
      id: schema.invitations.id,
      name: schema.invitations.name,
      email: schema.invitations.email,
      roleName: schema.roles.name,
      expiresAt: schema.invitations.expiresAt,
    })
    .from(schema.invitations)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.invitations.roleId))
    .where(and(isNull(schema.invitations.acceptedAt), isNull(schema.invitations.revokedAt)))
    .orderBy(asc(schema.invitations.name));
  return rows.map((row) => ({ ...row, expired: row.expiresAt <= now }));
}

/** Roles que se pueden asignar: los de sistema (el MVP no tiene roles propios). */
export async function listAssignableRoles(tx: Transaction) {
  return tx
    .select({ id: schema.roles.id, key: schema.roles.key, name: schema.roles.name })
    .from(schema.roles)
    .where(isNull(schema.roles.organizationId));
}
