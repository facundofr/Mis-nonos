import { and, eq, gt, isNull, sql } from "drizzle-orm";

import * as schema from "@/db/schema";
import { diffChanges, recordAudit } from "@/lib/audit";
import type { Database, Transaction } from "@/lib/db/client";
import { withTenant } from "@/lib/db/tenant";

import { AUTH_POLICY } from "./policy";
import { generateToken, hashToken, isWellFormedToken } from "./tokens";

/*
 * Invitaciones (F.5, F.6). Reciben la base por parámetro para poder usarse
 * desde las pantallas, el script de alta (DC-12) y las pruebas.
 */

export interface InvitationView {
  id: string;
  organizationId: string;
  organizationName: string;
  siteId: string | null;
  email: string;
  name: string;
  roleId: string;
  roleKey: string;
  roleName: string;
  phone: string | null;
  licenseNumber: string | null;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
}

export type InvitationState = "pending" | "expired" | "accepted" | "revoked";

export function invitationState(
  invitation: Pick<InvitationView, "expiresAt" | "acceptedAt" | "revokedAt">,
  now: Date,
): InvitationState {
  if (invitation.acceptedAt) return "accepted";
  if (invitation.revokedAt) return "revoked";
  if (invitation.expiresAt.getTime() <= now.getTime()) return "expired";
  return "pending";
}

interface InvitationRow extends Record<string, unknown> {
  id: string;
  organization_id: string;
  organization_name: string;
  site_id: string | null;
  email: string;
  name: string;
  role_id: string;
  role_key: string;
  role_name: string;
  phone: string | null;
  license_number: string | null;
  expires_at: Date;
  accepted_at: Date | null;
  revoked_at: Date | null;
}

/**
 * Busca una invitación por su token, sin contexto de residencia: pasa por
 * app.find_invitation, que solo devuelve la fila de ese hash.
 */
export async function findInvitationByToken(
  db: Database,
  token: string,
): Promise<InvitationView | null> {
  if (!isWellFormedToken(token)) return null;
  const result = await db.execute<InvitationRow>(
    sql`select * from app.find_invitation(${hashToken(token)})`,
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    siteId: row.site_id,
    email: row.email,
    name: row.name,
    roleId: row.role_id,
    roleKey: row.role_key,
    roleName: row.role_name,
    phone: row.phone,
    licenseNumber: row.license_number,
    expiresAt: new Date(row.expires_at),
    acceptedAt: row.accepted_at ? new Date(row.accepted_at) : null,
    revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
  };
}

export interface CreateInvitationInput {
  organizationId: string;
  siteId?: string | null;
  email: string;
  name: string;
  roleId: string;
  phone?: string | null;
  licenseNumber?: string | null;
  /** Nulo cuando invita el sistema (alta de la residencia, DC-12). */
  invitedBy: string | null;
  now?: Date;
}

/**
 * Crea una invitación y anula las pendientes para el mismo email en esa
 * residencia. Corre dentro de una transacción con el contexto de la
 * residencia (o con el rol dueño, en el script de alta). Devuelve el token:
 * es la única vez que se conoce, porque la base guarda solo su hash.
 */
export async function createInvitation(
  tx: Transaction,
  input: CreateInvitationInput,
): Promise<{ invitationId: string; token: string; expiresAt: Date }> {
  const now = input.now ?? new Date();
  const token = generateToken();
  const expiresAt = new Date(now.getTime() + AUTH_POLICY.invitationSeconds * 1000);
  const email = input.email.trim().toLowerCase();

  await tx
    .update(schema.invitations)
    .set({ revokedAt: now })
    .where(
      and(
        eq(schema.invitations.organizationId, input.organizationId),
        eq(schema.invitations.email, email),
        isNull(schema.invitations.acceptedAt),
        isNull(schema.invitations.revokedAt),
      ),
    );

  const [row] = await tx
    .insert(schema.invitations)
    .values({
      organizationId: input.organizationId,
      siteId: input.siteId ?? null,
      email,
      name: input.name.trim(),
      roleId: input.roleId,
      phone: input.phone ?? null,
      licenseNumber: input.licenseNumber ?? null,
      tokenHash: hashToken(token),
      expiresAt,
      invitedBy: input.invitedBy,
    })
    .returning({ id: schema.invitations.id });
  if (!row) throw new Error("No se pudo crear la invitación.");

  await recordAudit(
    tx,
    { organizationId: input.organizationId, userId: input.invitedBy },
    {
      action: "invitation.created",
      entityType: "invitation",
      entityId: row.id,
      siteId: input.siteId ?? null,
      changes: diffChanges(null, { email, name: input.name.trim(), roleId: input.roleId }),
    },
  );

  return { invitationId: row.id, token, expiresAt };
}

export type AcceptInvitationResult =
  | { ok: true; email: string; organizationId: string }
  | {
      ok: false;
      reason: "invalid" | "expired" | "accepted" | "revoked" | "account-exists" | "email-mismatch";
    };

/** ¿Hay una cuenta con este email? La página de invitación decide qué formulario mostrar. */
export async function accountExists(db: Database, email: string): Promise<boolean> {
  const rows = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  return rows.length > 0;
}

/**
 * Acepta una invitación creando la cuenta: usuario, contraseña, membresía,
 * invitación aceptada y auditoría, todo en una sola transacción.
 */
export async function acceptInvitationAsNewUser(
  db: Database,
  input: {
    token: string;
    name: string;
    password: string;
    hashPassword: (password: string) => Promise<string>;
    now?: Date;
  },
): Promise<AcceptInvitationResult> {
  const now = input.now ?? new Date();
  const invitation = await findInvitationByToken(db, input.token);
  if (!invitation) return { ok: false, reason: "invalid" };
  const state = invitationState(invitation, now);
  if (state !== "pending") return { ok: false, reason: state };
  if (await accountExists(db, invitation.email)) return { ok: false, reason: "account-exists" };

  const passwordHash = await input.hashPassword(input.password);
  // El identificador se pide antes para fijar el contexto de la transacción.
  const idResult = await db.execute<{ id: string }>(sql`select uuidv7() as id`);
  const userId = idResult.rows[0]?.id;
  if (!userId) throw new Error("No se pudo generar el identificador del usuario.");

  try {
    await withTenant(db, { organizationId: invitation.organizationId, userId }, async (tx) => {
      await tx.insert(schema.users).values({
        id: userId,
        name: input.name.trim(),
        email: invitation.email,
        // Abrir el enlace prueba que la persona controla ese email.
        emailVerified: true,
      });
      await tx.insert(schema.accounts).values({
        userId,
        accountId: userId,
        providerId: "credential",
        password: passwordHash,
      });
      await joinOrganization(tx, invitation, userId, now);
    });
  } catch (error) {
    if (error instanceof InvitationNoLongerPendingError) return { ok: false, reason: "invalid" };
    throw error;
  }
  return { ok: true, email: invitation.email, organizationId: invitation.organizationId };
}

/** Acepta una invitación con una cuenta que ya existe (la persona ya ingresó). */
export async function acceptInvitationAsExistingUser(
  db: Database,
  input: { token: string; userId: string; userEmail: string; now?: Date },
): Promise<AcceptInvitationResult> {
  const now = input.now ?? new Date();
  const invitation = await findInvitationByToken(db, input.token);
  if (!invitation) return { ok: false, reason: "invalid" };
  const state = invitationState(invitation, now);
  if (state !== "pending") return { ok: false, reason: state };
  if (invitation.email.toLowerCase() !== input.userEmail.toLowerCase()) {
    return { ok: false, reason: "email-mismatch" };
  }

  try {
    await withTenant(
      db,
      { organizationId: invitation.organizationId, userId: input.userId },
      (tx) => joinOrganization(tx, invitation, input.userId, now),
    );
  } catch (error) {
    if (error instanceof InvitationNoLongerPendingError) return { ok: false, reason: "invalid" };
    throw error;
  }
  return { ok: true, email: invitation.email, organizationId: invitation.organizationId };
}

class InvitationNoLongerPendingError extends Error {}

/** Membresía (nueva o reactivada), invitación aceptada y auditoría. */
async function joinOrganization(
  tx: Transaction,
  invitation: InvitationView,
  userId: string,
  now: Date,
): Promise<void> {
  const accepted = await tx
    .update(schema.invitations)
    .set({ acceptedAt: now, acceptedUserId: userId })
    .where(
      and(
        eq(schema.invitations.id, invitation.id),
        isNull(schema.invitations.acceptedAt),
        isNull(schema.invitations.revokedAt),
        gt(schema.invitations.expiresAt, now),
      ),
    )
    .returning({ id: schema.invitations.id });
  // Otra pestaña la aceptó o alguien la anuló mientras tanto.
  if (accepted.length !== 1) throw new InvitationNoLongerPendingError();

  await tx
    .insert(schema.organizationMemberships)
    .values({
      organizationId: invitation.organizationId,
      siteId: invitation.siteId,
      userId,
      roleId: invitation.roleId,
      phone: invitation.phone,
      licenseNumber: invitation.licenseNumber,
      status: "active",
    })
    .onConflictDoUpdate({
      target: [
        schema.organizationMemberships.organizationId,
        schema.organizationMemberships.userId,
      ],
      set: {
        siteId: invitation.siteId,
        roleId: invitation.roleId,
        status: "active",
        updatedAt: now,
      },
    });

  await recordAudit(
    tx,
    { organizationId: invitation.organizationId, userId },
    {
      action: "invitation.accepted",
      entityType: "invitation",
      entityId: invitation.id,
      siteId: invitation.siteId,
      metadata: { roleKey: invitation.roleKey },
    },
  );
}
