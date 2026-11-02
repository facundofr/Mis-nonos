import { z } from "zod";

/*
 * Identificadores de ingreso. Quien tiene email entra con su email; quien no
 * tiene, con un usuario que crea Administración (DC-11).
 */

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

// Minúsculas, números, punto y guion bajo; empieza y termina con letra o número.
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

/** Valida un usuario ya normalizado. La base repite la regla (users_username_format_check). */
export function isValidUsername(value: string): boolean {
  return (
    value.length >= USERNAME_MIN_LENGTH &&
    value.length <= USERNAME_MAX_LENGTH &&
    USERNAME_PATTERN.test(value) &&
    !/[._]{2}/.test(value)
  );
}

/**
 * Dominio reservado (RFC 2606) para el email técnico de quien no tiene email:
 * Better Auth exige un email por persona y este nunca recibe correo.
 */
export const NO_EMAIL_DOMAIN = "sin-email.invalid";

export function technicalEmailFor(username: string): string {
  return `${username}@${NO_EMAIL_DOMAIN}`;
}

/** Falso para los emails técnicos: a esas direcciones no se manda nada. */
export function canReceiveEmail(email: string): boolean {
  return !email.trim().toLowerCase().endsWith(".invalid");
}

export type LoginIdentifier =
  { kind: "email"; value: string } | { kind: "username"; value: string };

const emailSchema = z.email();

/** Interpreta el campo "Email o usuario" del ingreso. Nulo si no es ninguno de los dos. */
export function parseLoginIdentifier(raw: string): LoginIdentifier | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.includes("@")) {
    return emailSchema.safeParse(value).success
      ? { kind: "email", value: value.toLowerCase() }
      : null;
  }
  const username = normalizeUsername(value);
  return isValidUsername(username) ? { kind: "username", value: username } : null;
}

/**
 * Ruta interna a la que volver después de ingresar. Cualquier otra cosa (otro
 * sitio, "//", barras invertidas, caracteres de control) vuelve al inicio:
 * evita redirecciones abiertas.
 */
export function safeRedirectPath(value: unknown, fallback = "/inicio"): string {
  if (typeof value !== "string" || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  // Barras invertidas y caracteres de control.
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}
