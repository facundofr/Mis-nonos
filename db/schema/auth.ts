import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { citext, createdAt, primaryId, updatedAt } from "./_shared";

/*
 * Tablas de identidad que usa Better Auth (DC-07: solo identidad, sesiones
 * y 2FA). Las propiedades siguen su modelo; las columnas, la convención
 * snake_case del proyecto. Las sesiones están en sessions.ts.
 *
 * Excepción a RLS, documentada en docs/decisions/0002 y 0003: la identidad
 * es global (una persona puede trabajar en varias residencias) y el ingreso
 * la busca antes de saber la residencia. No guardan datos de residentes.
 */

export const users = pgTable(
  "users",
  {
    id: primaryId(),
    name: text("name").notNull(),
    // Quien entra con usuario (DC-11) tiene un email técnico que nunca
    // recibe correo (dominio .invalid): ver lib/auth/identifiers.ts.
    email: citext("email").notNull().unique("users_email_unique"),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    // Plugin username (DC-11): en minúsculas y único en toda la plataforma.
    username: citext("username").unique("users_username_unique"),
    // Plugin twoFactor: obligatoria para Administración y Dirección.
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    // La contraseña la puso Administración (alta sin email o restablecida,
    // DC-11): al ingresar, la persona tiene que elegir una propia.
    passwordChangeRequired: boolean("password_change_required").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check(
      "users_username_format_check",
      sql`${t.username} is null or ${t.username}::text ~ '^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$'`,
    ),
  ],
);

/** Credenciales. En el MVP solo hay contraseñas (proveedor "credential", scrypt). */
export const accounts = pgTable(
  "accounts",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("accounts_user_idx").on(t.userId),
    uniqueIndex("accounts_provider_account_unique").on(t.providerId, t.accountId),
  ],
);

/** Valores de un solo uso de Better Auth (recuperar contraseña, 2FA en curso). */
export const verifications = pgTable(
  "verifications",
  {
    id: primaryId(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);

/**
 * Segundo factor (TOTP). Better Auth guarda el secreto y los códigos de
 * respaldo cifrados con BETTER_AUTH_SECRET.
 */
export const twoFactors = pgTable(
  "two_factors",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    // Falso mientras la persona no confirma el primer código.
    verified: boolean("verified").notNull().default(true),
    failedVerificationCount: integer("failed_verification_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
  },
  (t) => [uniqueIndex("two_factors_user_unique").on(t.userId)],
);
