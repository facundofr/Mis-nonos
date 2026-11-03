/*
 * Reglas de la asistencia (docs/decisions/0020), sin base de datos.
 */

export type AttendanceKind = "in" | "out";

export interface AttendanceMark {
  kind: AttendanceKind;
  occurredAt: Date;
}

/** Una entrada sin salida después de este tiempo se toma como olvidada. */
export const OPEN_ENTRY_MAX_MS = 16 * 60 * 60 * 1000;

/** Dos registros iguales dentro de este tiempo son un doble toque. */
export const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

/** ¿La persona está adentro? Entró hace menos de 16 h y no salió. */
export function isInside(last: AttendanceMark | null, now: Date): boolean {
  return (
    last !== null &&
    last.kind === "in" &&
    now.getTime() - last.occurredAt.getTime() < OPEN_ENTRY_MAX_MS
  );
}

/** Qué registra el próximo escaneo: la salida si está adentro, si no la entrada. */
export function nextKind(last: AttendanceMark | null, now: Date): AttendanceKind {
  return isInside(last, now) ? "out" : "in";
}

/** El mismo registro de recién (doble toque o recarga): no se repite. */
export function isDuplicate(last: AttendanceMark | null, kind: AttendanceKind, now: Date): boolean {
  return (
    last !== null &&
    last.kind === kind &&
    now.getTime() - last.occurredAt.getTime() < DUPLICATE_WINDOW_MS
  );
}

/** Compara dos códigos sin cortar en la primera diferencia. */
export function sameToken(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index++) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

/** Formato del código del QR: 64 caracteres hexadecimales. */
export const TOKEN_PATTERN = /^[0-9a-f]{64}$/;
