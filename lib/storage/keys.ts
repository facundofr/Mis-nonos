import { randomUUID } from "node:crypto";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** residencia/año/mes/aleatorio, sin nombre ni extensión: no revela nada del contenido. */
const STORAGE_KEY = new RegExp(`^${UUID}/\\d{4}/\\d{2}/${UUID}$`);

/**
 * Clave nueva para un archivo. La parte final es aleatoria (UUIDv4), así que
 * no se puede adivinar ni enumerar; el tipo del archivo queda en la base.
 */
export function newStorageKey(organizationId: string, now = new Date()): string {
  if (!new RegExp(`^${UUID}$`).test(organizationId)) {
    throw new Error("Identificador de residencia inválido para la clave del archivo.");
  }
  const year = now.getUTCFullYear().toString();
  const month = (now.getUTCMonth() + 1).toString().padStart(2, "0");
  return `${organizationId}/${year}/${month}/${randomUUID()}`;
}

export function isValidStorageKey(key: string): boolean {
  return STORAGE_KEY.test(key);
}
