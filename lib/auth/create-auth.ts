import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor, username } from "better-auth/plugins";

import * as schema from "@/db/schema";
import { BRAND } from "@/lib/brand";
import type { Database } from "@/lib/db/client";

import { AUTH_COOKIE_PREFIX } from "./cookies";
import { isValidUsername, USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "./identifiers";
import { AUTH_POLICY, capNewSession } from "./policy";

export interface CreateAuthOptions {
  db: Database;
  /** BETTER_AUTH_SECRET: firma cookies y cifra los secretos del 2FA. */
  secret: string;
  /** URL pública de la app (APP_URL). */
  baseURL: string;
  /** Envía el enlace para crear una nueva contraseña. */
  sendPasswordReset: (input: { email: string; name: string; url: string }) => Promise<void>;
}

/**
 * Configuración de Better Auth (DC-07: solo identidad, sesiones y 2FA).
 * Las pantallas lo usan desde Server Actions (`auth.api`); no se publican sus
 * rutas HTTP (docs/decisions/0003). Sin "server-only" para poder probarlo.
 */
export function createAuth(options: CreateAuthOptions) {
  return betterAuth({
    appName: BRAND.appName,
    baseURL: options.baseURL,
    secret: options.secret,
    trustedOrigins: [options.baseURL],
    database: drizzleAdapter(options.db, {
      provider: "pg",
      transaction: true,
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
        twoFactor: schema.twoFactors,
      },
    }),
    emailAndPassword: {
      enabled: true,
      // Nadie se registra solo: las cuentas nacen de una invitación o las
      // crea Administración (DC-11, DC-12).
      disableSignUp: true,
      minPasswordLength: AUTH_POLICY.passwordMinLength,
      maxPasswordLength: AUTH_POLICY.passwordMaxLength,
      resetPasswordTokenExpiresIn: AUTH_POLICY.passwordResetSeconds,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, token }) => {
        // Enlace a la pantalla propia, no a la ruta HTTP de Better Auth.
        const url = new URL("/restablecer", options.baseURL);
        url.searchParams.set("token", token);
        await options.sendPasswordReset({ email: user.email, name: user.name, url: url.href });
      },
    },
    user: {
      additionalFields: {
        // DC-11: contraseña provisoria puesta por Administración.
        passwordChangeRequired: {
          type: "boolean",
          required: false,
          defaultValue: false,
          input: false,
        },
      },
    },
    session: {
      expiresIn: AUTH_POLICY.rememberedSessionSeconds,
      updateAge: AUTH_POLICY.sessionUpdateAgeSeconds,
      // Sin caché en cookie: una sesión cerrada o vencida deja de valer en
      // el pedido siguiente.
      cookieCache: { enabled: false },
      additionalFields: {
        activeOrganizationId: { type: "string", required: false, input: false },
        absoluteExpiresAt: { type: "date", required: false, input: false },
        lastActiveAt: { type: "date", required: false, input: false },
      },
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const capped = capNewSession(
              {
                expiresAt: session.expiresAt,
                absoluteExpiresAt: toDateOrNull(session.absoluteExpiresAt),
              },
              new Date(),
            );
            return { data: { ...session, ...capped } };
          },
        },
      },
    },
    plugins: [
      username({
        minUsernameLength: USERNAME_MIN_LENGTH,
        maxUsernameLength: USERNAME_MAX_LENGTH,
        usernameValidator: isValidUsername,
        displayUsername: false,
      }),
      twoFactor({ issuer: BRAND.appName }),
      // Último: guarda las cookies de sesión desde las Server Actions.
      nextCookies(),
    ],
    advanced: {
      cookiePrefix: AUTH_COOKIE_PREFIX,
      useSecureCookies: options.baseURL.startsWith("https://"),
      // Los identificadores los genera PostgreSQL (UUIDv7).
      database: { generateId: false },
    },
    // Los límites de intentos viven en las Server Actions (lib/auth/limiters.ts).
    rateLimit: { enabled: false },
    telemetry: { enabled: false },
    logger: { level: "error" },
  });
}

export type Auth = ReturnType<typeof createAuth>;

function toDateOrNull(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}
