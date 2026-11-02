import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";

/*
 * Enlaces temporales a archivos privados (10.5, E12). El enlace vale unos
 * minutos, para un archivo y para una persona: copiado a otro dispositivo
 * o abierto más tarde, ya no sirve. La ruta que entrega el archivo además
 * vuelve a verificar la sesión y el permiso, y registra la apertura.
 */

/** Cuánto vale un enlace a un archivo. */
export const FILE_LINK_TTL_SECONDS = 5 * 60;

/** Clave propia para estos enlaces, derivada del secreto de la app (HKDF). */
export function deriveFileLinkKey(appSecret: string): Buffer {
  return Buffer.from(hkdfSync("sha256", appSecret, "residencia360", "file-link-v1", 32));
}

function signature(key: Buffer, fileId: string, userId: string, expiresAt: number): string {
  return createHmac("sha256", key)
    .update(`file:${fileId}:${userId}:${expiresAt}`)
    .digest("base64url");
}

/** Token para el enlace: `<vencimiento>.<firma>`. No incluye el archivo ni la persona. */
export function signFileLink(input: {
  key: Buffer;
  fileId: string;
  userId: string;
  now?: Date;
  ttlSeconds?: number;
}): string {
  const now = Math.floor((input.now ?? new Date()).getTime() / 1000);
  const expiresAt = now + (input.ttlSeconds ?? FILE_LINK_TTL_SECONDS);
  return `${expiresAt}.${signature(input.key, input.fileId, input.userId, expiresAt)}`;
}

/** ¿El token es de este archivo, para esta persona y sigue vigente? */
export function verifyFileLink(input: {
  key: Buffer;
  token: string;
  fileId: string;
  userId: string;
  now?: Date;
}): boolean {
  const match = /^(\d{1,12})\.([A-Za-z0-9_-]{43})$/.exec(input.token);
  if (!match) return false;
  const expiresAt = Number(match[1]);
  const now = Math.floor((input.now ?? new Date()).getTime() / 1000);
  if (expiresAt <= now) return false;

  const expected = Buffer.from(signature(input.key, input.fileId, input.userId, expiresAt));
  const received = Buffer.from(match[2]!);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
