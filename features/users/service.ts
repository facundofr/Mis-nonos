import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";

import * as schema from "@/db/schema";
import { diffChanges, recordAudit } from "@/lib/audit";
import { createInvitation } from "@/lib/auth/invitations";
import { canReceiveEmail, technicalEmailFor } from "@/lib/auth/identifiers";
import { MANAGER_ROLES } from "@/lib/auth/policy";
import type { Transaction } from "@/lib/db/client";
import type { TenantContext } from "@/lib/db/tenant";
import { DomainError } from "@/lib/errors";

import { getMember, type MemberRow } from "./queries";
import type {
  CreateWithoutEmailInput,
  InviteInput,
  ProfileInput,
  UpdateMemberInput,
} from "./schemas";

/*
 * Reglas de usuarios y roles (F1-USR-01, F1-USR-02, DC-11). Corren dentro
 * de withTenant con quien actúa; el permiso (users.manage) ya lo verificó
 * la Server Action. Cada cambio queda en la auditoría.
 */

async function roleIdFor(tx: Transaction, roleKey: string): Promise<string> {
  const [role] = await tx
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .where(and(eq(schema.roles.key, roleKey), isNull(schema.roles.organizationId)));
  if (!role) throw new DomainError("Ese rol no existe.", "roleKey");
  return role.id;
}

async function requireMember(tx: Transaction, membershipId: string): Promise<MemberRow> {
  const member = await getMember(tx, membershipId);
  if (!member) throw new DomainError("Esa persona no está en la residencia.");
  return member;
}

/** El usuario Master es uno solo y no se asigna ni se toca desde la app (0021). */
const MASTER_LOCKED_MESSAGE = "El usuario Master no se puede modificar desde la app.";

function refuseMasterRole(roleKey: string): void {
  if (roleKey === "master") {
    throw new DomainError("El rol Master no se asigna desde la app.", "roleKey");
  }
}

/** Cuántas personas de Administración (o Master) activas hay, sin contar una. */
async function otherActiveAdmins(tx: Transaction, exceptMembershipId: string): Promise<number> {
  const [row] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.organizationMemberships)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.organizationMemberships.roleId))
    .where(
      and(
        inArray(schema.roles.key, [...MANAGER_ROLES]),
        eq(schema.organizationMemberships.status, "active"),
        ne(schema.organizationMemberships.id, exceptMembershipId),
      ),
    );
  return row?.count ?? 0;
}

const LAST_ADMIN_MESSAGE =
  "Tiene que quedar al menos una persona de Administración activa: es la única que puede gestionar usuarios.";

/** Invitación por email (diseño InvitarUsuario). Devuelve el token para el enlace. */
export async function inviteMember(tx: Transaction, actor: TenantContext, input: InviteInput) {
  const [existing] = await tx
    .select({ status: schema.organizationMemberships.status })
    .from(schema.organizationMemberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
    .where(
      and(
        eq(schema.users.email, input.email),
        eq(schema.organizationMemberships.organizationId, actor.organizationId),
      ),
    );
  if (existing?.status === "active") {
    throw new DomainError("Esa persona ya trabaja en la residencia.", "email");
  }
  if (existing?.status === "disabled") {
    throw new DomainError(
      "Esa persona está desactivada en la residencia: reactivala desde su ficha.",
      "email",
    );
  }

  refuseMasterRole(input.roleKey);
  const roleId = await roleIdFor(tx, input.roleKey);
  const invitation = await createInvitation(tx, {
    organizationId: actor.organizationId,
    siteId: null,
    email: input.email,
    name: input.name,
    roleId,
    phone: input.phone,
    profession: input.profession,
    licenseNumber: input.licenseNumber,
    invitedBy: actor.userId,
  });
  return invitation;
}

/**
 * Alta de una persona sin email (DC-11): entra con usuario y una contraseña
 * provisoria que le da Administración; al primer ingreso elige la suya.
 */
export async function createMemberWithoutEmail(
  tx: Transaction,
  actor: TenantContext,
  input: Omit<CreateWithoutEmailInput, "temporaryPassword"> & { passwordHash: string },
): Promise<{ userId: string; membershipId: string }> {
  const [taken] = await tx
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.username, input.username));
  if (taken) throw new DomainError("Ese usuario ya existe: elegí otro.", "username");

  refuseMasterRole(input.roleKey);
  const roleId = await roleIdFor(tx, input.roleKey);
  const [user] = await tx
    .insert(schema.users)
    .values({
      name: input.name,
      email: technicalEmailFor(input.username),
      username: input.username,
      passwordChangeRequired: true,
    })
    .returning({ id: schema.users.id });
  if (!user) throw new Error("No se pudo crear el usuario.");

  await tx.insert(schema.accounts).values({
    userId: user.id,
    accountId: user.id,
    providerId: "credential",
    password: input.passwordHash,
  });

  const [membership] = await tx
    .insert(schema.organizationMemberships)
    .values({
      organizationId: actor.organizationId,
      userId: user.id,
      roleId,
      status: "active",
      phone: input.phone,
      profession: input.profession,
      licenseNumber: input.licenseNumber,
    })
    .returning({ id: schema.organizationMemberships.id });
  if (!membership) throw new Error("No se pudo crear la membresía.");

  await recordAudit(tx, actor, {
    action: "user.created",
    entityType: "membership",
    entityId: membership.id,
    changes: diffChanges(null, {
      name: input.name,
      username: input.username,
      roleKey: input.roleKey,
    }),
    metadata: { sinEmail: true },
  });
  return { userId: user.id, membershipId: membership.id };
}

/**
 * Alta con email y contraseña provisoria (docs/decisions/0018): la app la
 * genera, se la manda por email y al primer ingreso la persona elige una
 * propia. Si el email ya tiene cuenta (por ejemplo, en otra residencia), se
 * usa la invitación por enlace.
 */
export async function createMemberWithEmail(
  tx: Transaction,
  actor: TenantContext,
  input: InviteInput & { passwordHash: string },
): Promise<{ userId: string; membershipId: string }> {
  const [existing] = await tx
    .select({ status: schema.organizationMemberships.status })
    .from(schema.organizationMemberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
    .where(
      and(
        eq(schema.users.email, input.email),
        eq(schema.organizationMemberships.organizationId, actor.organizationId),
      ),
    );
  if (existing?.status === "active") {
    throw new DomainError("Esa persona ya trabaja en la residencia.", "email");
  }
  if (existing?.status === "disabled") {
    throw new DomainError(
      "Esa persona está desactivada en la residencia: reactivala desde su ficha.",
      "email",
    );
  }

  refuseMasterRole(input.roleKey);
  const roleId = await roleIdFor(tx, input.roleKey);
  const [user] = await tx
    .insert(schema.users)
    .values({ name: input.name, email: input.email, passwordChangeRequired: true })
    .onConflictDoNothing()
    .returning({ id: schema.users.id });
  if (!user) {
    throw new DomainError(
      "Ese email ya tiene una cuenta en Mis Nonos: sumala con “Invitar con enlace”.",
      "email",
    );
  }

  await tx.insert(schema.accounts).values({
    userId: user.id,
    accountId: user.id,
    providerId: "credential",
    password: input.passwordHash,
  });

  const [membership] = await tx
    .insert(schema.organizationMemberships)
    .values({
      organizationId: actor.organizationId,
      userId: user.id,
      roleId,
      status: "active",
      phone: input.phone,
      profession: input.profession,
      licenseNumber: input.licenseNumber,
    })
    .returning({ id: schema.organizationMemberships.id });
  if (!membership) throw new Error("No se pudo crear la membresía.");

  await recordAudit(tx, actor, {
    action: "user.created",
    entityType: "membership",
    entityId: membership.id,
    changes: diffChanges(null, { name: input.name, email: input.email, roleKey: input.roleKey }),
    metadata: { contrasenaProvisoria: true },
  });
  return { userId: user.id, membershipId: membership.id };
}

export async function updateMember(
  tx: Transaction,
  actor: TenantContext,
  membershipId: string,
  input: UpdateMemberInput,
): Promise<void> {
  const before = await requireMember(tx, membershipId);
  if (before.roleKey === "master" && before.userId !== actor.userId) {
    throw new DomainError(MASTER_LOCKED_MESSAGE);
  }
  if (before.roleKey !== input.roleKey) {
    refuseMasterRole(input.roleKey);
    if (before.userId === actor.userId) {
      throw new DomainError("No podés cambiar tu propio rol.", "roleKey");
    }
    if (MANAGER_ROLES.includes(before.roleKey as never) && before.status === "active") {
      if ((await otherActiveAdmins(tx, membershipId)) === 0) {
        throw new DomainError(LAST_ADMIN_MESSAGE, "roleKey");
      }
    }
  }

  const roleId = await roleIdFor(tx, input.roleKey);
  await tx
    .update(schema.organizationMemberships)
    .set({
      roleId,
      phone: input.phone,
      profession: input.profession,
      licenseNumber: input.licenseNumber,
      usualShiftId: input.usualShiftId,
    })
    .where(eq(schema.organizationMemberships.id, membershipId));

  const changes = diffChanges(
    {
      roleKey: before.roleKey,
      phone: before.phone,
      profession: before.profession,
      licenseNumber: before.licenseNumber,
      usualShiftId: before.usualShiftId,
    },
    {
      roleKey: input.roleKey,
      phone: input.phone,
      profession: input.profession,
      licenseNumber: input.licenseNumber,
      usualShiftId: input.usualShiftId,
    },
  );
  if (changes) {
    await recordAudit(tx, actor, {
      action: before.roleKey !== input.roleKey ? "membership.role_changed" : "membership.updated",
      entityType: "membership",
      entityId: membershipId,
      changes,
    });
  }
}

/**
 * Desactivar revoca el acceso en el momento y conserva el nombre en todo el
 * historial (7.3-A, 6.13). Reactivar devuelve el acceso con el mismo rol.
 */
export async function setMemberActive(
  tx: Transaction,
  actor: TenantContext,
  membershipId: string,
  active: boolean,
): Promise<void> {
  const member = await requireMember(tx, membershipId);
  const status = active ? "active" : "disabled";
  if (member.roleKey === "master") throw new DomainError(MASTER_LOCKED_MESSAGE);
  if (member.status === status) return;
  if (!active) {
    if (member.userId === actor.userId) {
      throw new DomainError("No podés desactivarte a vos mismo.");
    }
    if (
      MANAGER_ROLES.includes(member.roleKey as never) &&
      (await otherActiveAdmins(tx, membershipId)) === 0
    ) {
      throw new DomainError(LAST_ADMIN_MESSAGE);
    }
  }

  await tx
    .update(schema.organizationMemberships)
    .set({ status })
    .where(eq(schema.organizationMemberships.id, membershipId));

  if (!active) {
    // Las sesiones abiertas en esta residencia se cierran ya, no al vencer.
    await tx
      .delete(schema.sessions)
      .where(
        and(
          eq(schema.sessions.userId, member.userId),
          eq(schema.sessions.activeOrganizationId, actor.organizationId),
        ),
      );
  }

  await recordAudit(tx, actor, {
    action: active ? "membership.reactivated" : "membership.disabled",
    entityType: "membership",
    entityId: membershipId,
    changes: diffChanges({ status: member.status }, { status }),
  });
}

/**
 * Contraseña provisoria nueva (DC-11, docs/decisions/0018): la da
 * Administración, con o sin email. Cierra las sesiones de la persona y le
 * pide cambiarla al entrar. Devuelve el email real, si tiene, para mandarla.
 */
export async function resetTemporaryPassword(
  tx: Transaction,
  actor: TenantContext,
  membershipId: string,
  passwordHash: string,
): Promise<{ name: string; email: string | null }> {
  const member = await requireMember(tx, membershipId);
  if (member.userId === actor.userId) {
    throw new DomainError("Tu contraseña la cambiás desde tu perfil.");
  }
  if (member.roleKey === "master") throw new DomainError(MASTER_LOCKED_MESSAGE);

  const updated = await tx
    .update(schema.accounts)
    .set({ password: passwordHash })
    .where(
      and(eq(schema.accounts.userId, member.userId), eq(schema.accounts.providerId, "credential")),
    )
    .returning({ id: schema.accounts.id });
  if (updated.length !== 1) throw new Error("La cuenta no tiene contraseña.");

  await tx
    .update(schema.users)
    .set({ passwordChangeRequired: true })
    .where(eq(schema.users.id, member.userId));
  await tx.delete(schema.sessions).where(eq(schema.sessions.userId, member.userId));

  await recordAudit(tx, actor, {
    action: "user.password_reset",
    entityType: "membership",
    entityId: membershipId,
  });
  return {
    name: member.name,
    email: member.email && canReceiveEmail(member.email) ? member.email : null,
  };
}

/** Reenviar: una invitación nueva con los mismos datos (anula la anterior). */
export async function resendInvitation(
  tx: Transaction,
  actor: TenantContext,
  invitationId: string,
) {
  const [invitation] = await tx
    .select()
    .from(schema.invitations)
    .where(
      and(
        eq(schema.invitations.id, invitationId),
        isNull(schema.invitations.acceptedAt),
        isNull(schema.invitations.revokedAt),
      ),
    );
  if (!invitation) throw new DomainError("Esa invitación ya no está pendiente.");
  const created = await createInvitation(tx, {
    organizationId: actor.organizationId,
    siteId: invitation.siteId,
    email: invitation.email,
    name: invitation.name,
    roleId: invitation.roleId,
    phone: invitation.phone,
    profession: invitation.profession,
    licenseNumber: invitation.licenseNumber,
    invitedBy: actor.userId,
  });
  return { ...created, email: invitation.email, name: invitation.name, roleId: invitation.roleId };
}

export async function revokeInvitation(
  tx: Transaction,
  actor: TenantContext,
  invitationId: string,
): Promise<void> {
  const revoked = await tx
    .update(schema.invitations)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(schema.invitations.id, invitationId),
        isNull(schema.invitations.acceptedAt),
        isNull(schema.invitations.revokedAt),
      ),
    )
    .returning({ id: schema.invitations.id });
  if (revoked.length === 0) throw new DomainError("Esa invitación ya no está pendiente.");
  await recordAudit(tx, actor, {
    action: "invitation.revoked",
    entityType: "invitation",
    entityId: invitationId,
  });
}

/** El propio perfil: el nombre es de la persona; el teléfono, de esta residencia. */
export async function updateOwnProfile(
  tx: Transaction,
  actor: TenantContext,
  input: ProfileInput,
): Promise<void> {
  const [before] = await tx
    .select({
      name: schema.users.name,
      phone: schema.organizationMemberships.phone,
      membershipId: schema.organizationMemberships.id,
    })
    .from(schema.organizationMemberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
    // La política RLS deja ver las membresías propias de otras residencias.
    .where(
      and(
        eq(schema.organizationMemberships.userId, actor.userId),
        eq(schema.organizationMemberships.organizationId, actor.organizationId),
      ),
    );
  if (!before) throw new DomainError("No se encontró tu perfil.");

  await tx.update(schema.users).set({ name: input.name }).where(eq(schema.users.id, actor.userId));
  await tx
    .update(schema.organizationMemberships)
    .set({ phone: input.phone })
    .where(eq(schema.organizationMemberships.id, before.membershipId));

  const changes = diffChanges(
    { name: before.name, phone: before.phone },
    { name: input.name, phone: input.phone },
  );
  if (changes) {
    await recordAudit(tx, actor, {
      action: "profile.updated",
      entityType: "membership",
      entityId: before.membershipId,
      changes,
    });
  }
}
