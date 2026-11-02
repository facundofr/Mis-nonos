import { createHash, randomBytes } from "node:crypto";

/*
 * Tokens de los enlaces (invitaciones). El enlace lleva el token; la base
 * guarda solo su hash, así que una copia de la base no permite usarlos.
 */

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** 256 bits aleatorios en base64url (43 caracteres). */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 en hexadecimal (64 caracteres), el formato que exige la base. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Descarta enseguida lo que no puede ser un token, sin consultar la base. */
export function isWellFormedToken(value: string): boolean {
  return TOKEN_PATTERN.test(value);
}
