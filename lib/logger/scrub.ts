/*
 * Limpieza de datos personales y secretos antes de escribir un log (10.8,
 * E16). Los logs técnicos nunca guardan valores de pacientes, emails ni
 * tokens: solo lo necesario para diagnosticar.
 *
 * Por qué hace falta: Drizzle arma sus errores con los parámetros de la
 * consulta ("Failed query: …\nparams: ana@ejemplo.com,…") y PostgreSQL
 * agrega el valor que chocó en `detail` ("Key (email)=(…) already exists").
 */

export const REDACTED_TEXT = "[oculto]";

/** Error listo para un log: solo campos que no llevan valores de la consulta. */
export interface SafeError {
  type: string;
  message: string;
  stack?: string;
  /** Campos de PostgreSQL que identifican el problema sin mostrar valores. */
  code?: string;
  severity?: string;
  schema?: string;
  table?: string;
  column?: string;
  constraint?: string;
  routine?: string;
  /** Identificador de Next.js para buscar el error que vio la persona. */
  digest?: string;
  cause?: SafeError;
}

const SAFE_STRING_FIELDS = [
  "code",
  "severity",
  "schema",
  "table",
  "column",
  "constraint",
  "routine",
  "digest",
] as const;

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// Tokens de enlaces (base64url de 32 bytes o más) y hashes hex largos. Los
// UUID se conservan: son identificadores internos y ayudan a diagnosticar.
const LONG_TOKEN = /\b[A-Za-z0-9_-]{32,}\b/g;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Lo que sigue a "params:" en los errores de Drizzle, hasta el fin de línea.
const DRIZZLE_PARAMS = /\nparams: [^\n]*/g;
// "Key (email)=(ana@ejemplo.com)": el valor entre el segundo par de paréntesis.
const PG_KEY_VALUE = /(\([^)]*\)=)\([^)]*\)/g;

/** Quita parámetros, valores de claves, emails y tokens de un texto libre. */
export function scrubText(text: string): string {
  return text
    .replace(DRIZZLE_PARAMS, `\nparams: ${REDACTED_TEXT}`)
    .replace(PG_KEY_VALUE, `$1(${REDACTED_TEXT})`)
    .replace(EMAIL, "[email]")
    .replace(LONG_TOKEN, (match) => (UUID.test(match) ? match : "[token]"));
}

/** Convierte cualquier valor lanzado en un error seguro para registrar. */
export function serializeError(error: unknown, depth = 0): SafeError {
  if (!(error instanceof Error)) {
    return { type: typeof error, message: scrubText(String(error)) };
  }

  const message = scrubText(error.message);
  const constructorName = error.constructor?.name;
  const safe: SafeError = {
    type: constructorName && constructorName !== "Error" ? constructorName : error.name,
    message,
  };
  if (error.stack) {
    // La primera línea del stack repite el mensaje original.
    safe.stack = scrubText(error.stack.replace(error.message, () => message));
  }

  const fields = error as unknown as Record<string, unknown>;
  for (const field of SAFE_STRING_FIELDS) {
    const value = fields[field];
    if (typeof value === "string" && value.length > 0) safe[field] = value;
  }
  // `detail`, `where`, `hint`, `params` y `query` quedan afuera a propósito.

  if (error.cause !== undefined && depth < 3) {
    safe.cause = serializeError(error.cause, depth + 1);
  }
  return safe;
}

/** Una línea legible del error seguro, para la consola. */
export function formatSafeError(error: SafeError): string {
  const parts = [error.stack ?? `${error.type}: ${error.message}`];
  const extra = SAFE_STRING_FIELDS.filter((field) => error[field]).map(
    (field) => `${field}=${error[field]}`,
  );
  if (extra.length > 0) parts.push(`[${extra.join(" ")}]`);
  if (error.cause) parts.push(`Causa: ${formatSafeError(error.cause)}`);
  return parts.join("\n");
}

/**
 * Ruta de un pedido para el log: sin la query (puede traer tokens) y sin
 * el token de las invitaciones (/invitacion/<token>).
 */
export function scrubPath(path: string): string {
  const [pathname = ""] = path.split("?");
  return scrubText(pathname.replace(/^\/invitacion\/[^/]+/, "/invitacion/[token]"));
}
