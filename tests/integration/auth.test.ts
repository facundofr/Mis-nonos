import { APIError } from "better-auth/api";
import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import * as schema from "@/db/schema";
import { createAuth } from "@/lib/auth/create-auth";
import { technicalEmailFor } from "@/lib/auth/identifiers";
import {
  acceptInvitationAsNewUser,
  createInvitation,
  findInvitationByToken,
} from "@/lib/auth/invitations";
import { generateToken } from "@/lib/auth/tokens";
import { createDb, createPool } from "@/lib/db/client";
import { totp } from "@/tests/support/totp";

// Etapa 2.3: ingreso, invitaciones, sesiones (DC-10), usuario sin email
// (DC-11), recuperación de contraseña y 2FA contra PostgreSQL real. Datos
// ficticios.

const { ownerUrl, appUrl } = inject("databaseUrls");
const ownerPool = createPool(ownerUrl, { application_name: "pruebas-auth-dueno" });
const appPool = createPool(appUrl, { application_name: "pruebas-auth-app" });
const owner = createDb(ownerPool);
const app = createDb(appPool);

const resetLinks: string[] = [];
const auth = createAuth({
  db: app,
  secret: "secreto-de-pruebas-de-integracion-0123456789",
  baseURL: "http://localhost:3000",
  sendPasswordReset: async ({ url }) => {
    resetLinks.push(url);
  },
});
const hashPassword = async (password: string) => (await auth.$context).password.hash(password);

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const PASSWORD = "una frase de prueba larga";

const ids = { org: "", site: "", adminRole: "", careRole: "" };

afterAll(async () => {
  await Promise.all([ownerPool.end(), appPool.end()]);
});

beforeAll(async () => {
  const [org] = await owner
    .insert(schema.organizations)
    .values({ name: "Residencia de prueba (auth)" })
    .returning({ id: schema.organizations.id });
  ids.org = org!.id;
  const [site] = await owner
    .insert(schema.sites)
    .values({ organizationId: ids.org, name: "Sede de prueba" })
    .returning({ id: schema.sites.id });
  ids.site = site!.id;

  const systemRoles = await owner
    .select({ id: schema.roles.id, key: schema.roles.key })
    .from(schema.roles)
    .where(isNull(schema.roles.organizationId));
  ids.adminRole = systemRoles.find((role) => role.key === "admin")!.id;
  ids.careRole = systemRoles.find((role) => role.key === "profesional")!.id;
});

/** Crea una invitación con el rol dueño, como el script de alta (DC-12). */
async function invite(email: string, roleId = ids.careRole) {
  return owner.transaction((tx) =>
    createInvitation(tx, {
      organizationId: ids.org,
      email,
      name: "Persona de prueba",
      roleId,
      invitedBy: null,
    }),
  );
}

/** Ingresa con email y devuelve el encabezado Cookie de la sesión. */
async function signIn(email: string, password: string, rememberMe: boolean) {
  const { headers, response } = await auth.api.signInEmail({
    body: { email, password, rememberMe },
    returnHeaders: true,
    returnStatus: false,
  });
  const token = /r360\.session_token=([^;]+)/.exec(headers.get("set-cookie") ?? "")?.[1];
  return { response, cookie: token ? `r360.session_token=${token}` : null };
}

async function sessionsOf(userId: string) {
  return owner.select().from(schema.sessions).where(eq(schema.sessions.userId, userId));
}

async function userByEmail(email: string) {
  const [user] = await owner.select().from(schema.users).where(eq(schema.users.email, email));
  return user!;
}

async function pgError(operation: Promise<unknown>): Promise<{ code?: string }> {
  try {
    await operation;
  } catch (error) {
    return ((error as { cause?: unknown }).cause ?? error) as { code?: string };
  }
  throw new Error("Se esperaba un error de PostgreSQL");
}

describe("Invitaciones", () => {
  it("se buscan solo por su token y la app no las lista sin contexto", async () => {
    const { token } = await invite("busqueda@prueba.test");
    const found = await findInvitationByToken(app, token);
    expect(found).toMatchObject({
      email: "busqueda@prueba.test",
      organizationId: ids.org,
      roleKey: "profesional",
    });
    expect(await findInvitationByToken(app, generateToken())).toBeNull();
    expect(await app.select().from(schema.invitations)).toEqual([]);
  });

  it("aceptarla crea usuario, contraseña y membresía en una sola transacción", async () => {
    const { token, invitationId } = await invite("nueva@prueba.test");
    const result = await acceptInvitationAsNewUser(app, {
      token,
      name: "Nueva Persona",
      password: PASSWORD,
      hashPassword,
    });
    expect(result).toMatchObject({ ok: true, email: "nueva@prueba.test" });

    const user = await userByEmail("nueva@prueba.test");
    expect(user.emailVerified).toBe(true);
    const [account] = await owner
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.userId, user.id));
    expect(account?.providerId).toBe("credential");
    expect(account?.password).not.toContain(PASSWORD);

    const [membership] = await owner
      .select()
      .from(schema.organizationMemberships)
      .where(eq(schema.organizationMemberships.userId, user.id));
    expect(membership).toMatchObject({
      organizationId: ids.org,
      roleId: ids.careRole,
      status: "active",
    });

    const [invitation] = await owner
      .select()
      .from(schema.invitations)
      .where(eq(schema.invitations.id, invitationId));
    expect(invitation?.acceptedUserId).toBe(user.id);

    const audit = await owner
      .select({ action: schema.auditEvents.action })
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.entityId, invitationId));
    expect(audit.map((event) => event.action).sort()).toEqual([
      "invitation.accepted",
      "invitation.created",
    ]);

    const again = await acceptInvitationAsNewUser(app, {
      token,
      name: "Otra vez",
      password: PASSWORD,
      hashPassword,
    });
    expect(again).toEqual({ ok: false, reason: "accepted" });
  });

  it("una invitación nueva anula la anterior para el mismo email", async () => {
    const first = await invite("reenvio@prueba.test");
    await invite("reenvio@prueba.test");
    const old = await findInvitationByToken(app, first.token);
    expect(old?.revokedAt).not.toBeNull();
  });
});

describe("Ingreso y sesiones (DC-10)", () => {
  beforeAll(async () => {
    const { token } = await invite("ingreso@prueba.test");
    await acceptInvitationAsNewUser(app, {
      token,
      name: "Persona Ingreso",
      password: PASSWORD,
      hashPassword,
    });
  });

  it("con la contraseña incorrecta no abre sesión", async () => {
    await expect(
      auth.api.signInEmail({ body: { email: "ingreso@prueba.test", password: "incorrecta-123" } }),
    ).rejects.toBeInstanceOf(APIError);
  });

  it("sin 'Mantener sesión' la sesión dura 12 h", async () => {
    const before = Date.now();
    const { cookie } = await signIn("ingreso@prueba.test", PASSWORD, false);
    expect(cookie).not.toBeNull();
    const user = await userByEmail("ingreso@prueba.test");
    const newest = (await sessionsOf(user.id)).sort((a, b) => +b.createdAt - +a.createdAt)[0]!;
    expect(newest.absoluteExpiresAt).not.toBeNull();
    const lifetime = newest.expiresAt.getTime() - before;
    expect(lifetime).toBeGreaterThan(12 * HOUR - 60_000);
    expect(lifetime).toBeLessThanOrEqual(12 * HOUR + 60_000);
  });

  it("con 'Mantener sesión' dura 14 días y sin tope absoluto", async () => {
    const before = Date.now();
    await signIn("ingreso@prueba.test", PASSWORD, true);
    const user = await userByEmail("ingreso@prueba.test");
    const newest = (await sessionsOf(user.id)).sort((a, b) => +b.createdAt - +a.createdAt)[0]!;
    expect(newest.absoluteExpiresAt).toBeNull();
    expect(newest.expiresAt.getTime() - before).toBeGreaterThan(14 * DAY - 60_000);
  });

  it("cerrar la sesión la borra de la base", async () => {
    const { cookie } = await signIn("ingreso@prueba.test", PASSWORD, false);
    const user = await userByEmail("ingreso@prueba.test");
    const count = (await sessionsOf(user.id)).length;
    await auth.api.signOut({ headers: new Headers({ cookie: cookie! }) });
    expect(await sessionsOf(user.id)).toHaveLength(count - 1);
  });

  it("la app no puede borrar cuentas ni invitaciones", async () => {
    expect((await pgError(app.delete(schema.accounts))).code).toBe("42501");
    expect((await pgError(app.delete(schema.invitations))).code).toBe("42501");
  });
});

describe("Personal sin email (DC-11)", () => {
  it("ingresa con su usuario", async () => {
    const [user] = await owner
      .insert(schema.users)
      .values({
        name: "María Usuario",
        email: technicalEmailFor("maria.prueba"),
        username: "maria.prueba",
      })
      .returning({ id: schema.users.id });
    await owner.insert(schema.accounts).values({
      userId: user!.id,
      accountId: user!.id,
      providerId: "credential",
      password: await hashPassword(PASSWORD),
    });
    const result = await auth.api.signInUsername({
      body: { username: "maria.prueba", password: PASSWORD },
    });
    expect(result).toMatchObject({ user: { username: "maria.prueba" } });
  });

  it("la base rechaza usuarios con formato inválido", async () => {
    const error = await pgError(
      owner
        .insert(schema.users)
        .values({ name: "X", email: "x@prueba.test", username: "Con Espacios" }),
    );
    expect(error.code).toBe("23514");
  });
});

describe("Recuperar la contraseña", () => {
  it("el enlace cambia la contraseña y cierra las sesiones abiertas", async () => {
    const { token } = await invite("recupera@prueba.test");
    await acceptInvitationAsNewUser(app, {
      token,
      name: "Recupera",
      password: PASSWORD,
      hashPassword,
    });
    await signIn("recupera@prueba.test", PASSWORD, true);
    const user = await userByEmail("recupera@prueba.test");
    expect((await sessionsOf(user.id)).length).toBeGreaterThan(0);

    await auth.api.requestPasswordReset({
      body: { email: "recupera@prueba.test", redirectTo: "/restablecer" },
    });
    const link = new URL(resetLinks.at(-1)!);
    expect(link.pathname).toBe("/restablecer");
    const resetToken = link.searchParams.get("token")!;

    const newPassword = "otra frase de prueba larga";
    await auth.api.resetPassword({ body: { token: resetToken, newPassword } });
    expect(await sessionsOf(user.id)).toHaveLength(0);
    const { cookie } = await signIn("recupera@prueba.test", newPassword, false);
    expect(cookie).not.toBeNull();

    // El enlace es de un solo uso.
    await expect(
      auth.api.resetPassword({ body: { token: resetToken, newPassword: "tercera frase larga" } }),
    ).rejects.toBeInstanceOf(APIError);
  });

  it("no avisa si el email no existe", async () => {
    const before = resetLinks.length;
    await auth.api.requestPasswordReset({
      body: { email: "nadie@prueba.test", redirectTo: "/restablecer" },
    });
    expect(resetLinks).toHaveLength(before);
  });
});

describe("Verificación en dos pasos", () => {
  it("se activa con el primer código y después se pide al ingresar", async () => {
    const { token } = await invite("dospasos@prueba.test", ids.adminRole);
    await acceptInvitationAsNewUser(app, {
      token,
      name: "Dos Pasos",
      password: PASSWORD,
      hashPassword,
    });
    const { cookie } = await signIn("dospasos@prueba.test", PASSWORD, false);
    const headers = new Headers({ cookie: cookie! });

    const setup = await auth.api.enableTwoFactor({
      body: { password: PASSWORD, method: "totp" },
      headers,
    });
    if (setup.method !== "totp") throw new Error("Se esperaba TOTP");
    expect(setup.backupCodes.length).toBeGreaterThan(0);
    const secret = new URL(setup.totpURI).searchParams.get("secret")!;

    // Hasta confirmar el primer código, el 2FA no está activo.
    expect((await userByEmail("dospasos@prueba.test")).twoFactorEnabled).toBe(false);
    await auth.api.verifyTOTP({ body: { code: totp(secret) }, headers });
    expect((await userByEmail("dospasos@prueba.test")).twoFactorEnabled).toBe(true);

    const user = await userByEmail("dospasos@prueba.test");
    const sessionsBefore = (await sessionsOf(user.id)).length;
    const { response } = await signIn("dospasos@prueba.test", PASSWORD, false);
    expect(response).toMatchObject({ twoFactorRedirect: true });
    // Sin el código no se abre ninguna sesión nueva.
    expect(await sessionsOf(user.id)).toHaveLength(sessionsBefore);

    const [stored] = await owner
      .select({ secret: schema.twoFactors.secret })
      .from(schema.twoFactors)
      .where(and(eq(schema.twoFactors.userId, user.id)));
    expect(stored?.secret).not.toContain(secret);
  });
});
