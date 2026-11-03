import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import * as schema from "@/db/schema";
import { getDb, withUserContext, type TenantContext } from "@/lib/db";
import { env } from "@/lib/env";

import { evaluateSession, isPrivilegedRole } from "./policy";
import { getAuth } from "./server";

/*
 * Capa de acceso a la sesión. Cada página y cada Server Action de la app
 * llama a requireAppContext(): no alcanza con el layout ni con proxy.ts
 * (guía de autenticación de Next.js 16).
 */

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  username: string | null;
  twoFactorEnabled: boolean;
  /** La contraseña la puso Administración: hay que cambiarla antes de seguir (DC-11). */
  passwordChangeRequired: boolean;
}

export interface CurrentSession {
  id: string;
  createdAt: Date;
  activeOrganizationId: string | null;
  absoluteExpiresAt: Date | null;
  lastActiveAt: Date | null;
}

export interface Membership {
  organizationId: string;
  organizationName: string;
  siteId: string | null;
  roleId: string;
  roleKey: string;
  roleName: string;
}

export interface AppContext {
  user: SessionUser;
  session: CurrentSession;
  membership: Membership;
  /** Contexto para withTenant: la residencia activa y la persona. */
  tenant: TenantContext;
}

/** Sesión del pedido, o null. Better Auth la busca por la cookie y la valida en la base. */
export const getCurrentSession = cache(
  async (): Promise<{ user: SessionUser; session: CurrentSession } | null> => {
    const result = await getAuth().api.getSession({ headers: await headers() });
    if (!result) return null;
    const { user, session } = result;
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username ?? null,
        twoFactorEnabled: user.twoFactorEnabled === true,
        passwordChangeRequired: user.passwordChangeRequired === true,
      },
      session: {
        id: session.id,
        createdAt: new Date(session.createdAt),
        activeOrganizationId: session.activeOrganizationId ?? null,
        absoluteExpiresAt: toDate(session.absoluteExpiresAt),
        lastActiveAt: toDate(session.lastActiveAt),
      },
    };
  },
);

/** Exige una sesión vigente; si no hay, lleva al ingreso. */
export const requireSession = cache(async () => {
  const current = await getCurrentSession();
  if (!current) redirect("/ingresar");
  const { status } = evaluateSession({
    now: new Date(),
    createdAt: current.session.createdAt,
    absoluteExpiresAt: current.session.absoluteExpiresAt,
    lastActiveAt: current.session.lastActiveAt,
    roleKey: null,
  });
  if (status === "expired") {
    await deleteSession(current.session.id);
    redirect("/ingresar?motivo=vencida");
  }
  return current;
});

/** Residencias activas donde la persona tiene una membresía activa. */
export const getMemberships = cache(async (userId: string): Promise<Membership[]> =>
  withUserContext(getDb(), userId, (tx) =>
    tx
      .select({
        organizationId: schema.organizationMemberships.organizationId,
        organizationName: schema.organizations.name,
        siteId: schema.organizationMemberships.siteId,
        roleId: schema.organizationMemberships.roleId,
        roleKey: schema.roles.key,
        roleName: schema.roles.name,
      })
      .from(schema.organizationMemberships)
      .innerJoin(
        schema.organizations,
        eq(schema.organizations.id, schema.organizationMemberships.organizationId),
      )
      .innerJoin(schema.roles, eq(schema.roles.id, schema.organizationMemberships.roleId))
      .where(
        and(
          eq(schema.organizationMemberships.userId, userId),
          eq(schema.organizationMemberships.status, "active"),
          eq(schema.organizations.status, "active"),
        ),
      )
      .orderBy(asc(schema.organizations.name)),
  ),
);

export interface AppGates {
  /** Contraseña provisoria: primero se cambia (DC-11). */
  needsPasswordChange: boolean;
  /** Administración y Dirección: 2FA obligatorio (10.10). */
  needsTwoFactorSetup: boolean;
}

const resolveAppContext = cache(async (): Promise<AppContext & AppGates> => {
  const current = await requireSession();
  const memberships = await getMemberships(current.user.id);

  let membership = memberships.find(
    (candidate) => candidate.organizationId === current.session.activeOrganizationId,
  );
  if (!membership) {
    const only = memberships[0];
    if (!only) redirect("/sin-acceso");
    if (memberships.length > 1) redirect("/elegir-residencia");
    membership = only;
    await setActiveOrganization(current.session.id, membership.organizationId);
  }

  const { status, touch } = evaluateSession({
    now: new Date(),
    createdAt: current.session.createdAt,
    absoluteExpiresAt: current.session.absoluteExpiresAt,
    lastActiveAt: current.session.lastActiveAt,
    roleKey: membership.roleKey,
  });
  if (status !== "active") {
    await deleteSession(current.session.id);
    redirect(status === "inactive" ? "/ingresar?motivo=inactividad" : "/ingresar?motivo=vencida");
  }
  if (touch) await touchSession(current.session.id);

  return {
    user: current.user,
    session: current.session,
    membership,
    tenant: { organizationId: membership.organizationId, userId: current.user.id },
    needsPasswordChange: current.user.passwordChangeRequired,
    needsTwoFactorSetup:
      env.REQUIRE_PRIVILEGED_2FA &&
      isPrivilegedRole(membership.roleKey) &&
      !current.user.twoFactorEnabled,
  };
});

/**
 * Para las pantallas y acciones de la app: exige sesión, residencia activa y,
 * para Administración y Dirección, el 2FA activado.
 */
export async function requireAppContext(): Promise<AppContext> {
  const context = await resolveAppContext();
  if (context.needsPasswordChange) redirect("/cambiar-contrasena");
  if (context.needsTwoFactorSetup) redirect("/activar-2fa");
  return context;
}

/** Solo para la pantalla que activa el 2FA, que se usa antes de tenerlo. */
export async function requireAppContextForTwoFactorSetup(): Promise<AppContext & AppGates> {
  const context = await resolveAppContext();
  if (context.needsPasswordChange) redirect("/cambiar-contrasena");
  return context;
}

/** Para el marco de la app y la pantalla de cambio obligatorio de contraseña. */
export async function requireAppContextWithGates(): Promise<AppContext & AppGates> {
  return resolveAppContext();
}

/** Fija la residencia de la sesión. Quien llama ya validó la membresía. */
export async function setActiveOrganization(sessionId: string, organizationId: string) {
  await getDb()
    .update(schema.sessions)
    .set({ activeOrganizationId: organizationId })
    .where(eq(schema.sessions.id, sessionId));
}

async function touchSession(sessionId: string) {
  await getDb()
    .update(schema.sessions)
    .set({ lastActiveAt: new Date() })
    .where(eq(schema.sessions.id, sessionId));
}

/**
 * Borra la sesión en la base. Durante el render de una página no se pueden
 * cambiar cookies: la cookie queda, pero ya no abre ninguna sesión.
 */
async function deleteSession(sessionId: string) {
  await getDb().delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}
