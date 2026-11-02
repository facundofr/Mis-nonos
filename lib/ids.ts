import { getRandomValues } from "node:crypto";

/**
 * UUIDv7 generado en la app (RFC 9562), igual que el `uuidv7()` de
 * PostgreSQL 18. Sirve cuando la base no puede devolver el id, como en el
 * formulario público, que escribe sin RETURNING (12.9).
 */
export function uuidv7(now = Date.now()): string {
  const bytes = getRandomValues(new Uint8Array(16));
  let timestamp = BigInt(now);
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = Number(timestamp & 0xffn);
    timestamp >>= 8n;
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
