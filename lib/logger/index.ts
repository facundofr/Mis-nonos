import pino, { type DestinationStream, type Logger } from "pino";

import { REDACTED_TEXT, serializeError } from "./scrub";

export type { Logger } from "pino";
export { formatSafeError, scrubPath, scrubText, serializeError, type SafeError } from "./scrub";

/*
 * Logs estructurados en JSON (pino, sección 10.10). Lo usan la app y el
 * worker. Regla: nunca se loguean datos de pacientes ni de familias; si
 * algo se escapa, estos campos se reemplazan por "[oculto]" y los errores
 * pasan por serializeError (sin parámetros de consultas ni valores).
 */

const SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "email",
  "cookie",
  "authorization",
  "phone",
  "nationalId",
];

// Hasta dos niveles de profundidad: { password }, { user: { email } }.
const REDACT_PATHS = SENSITIVE_KEYS.flatMap((key) => [key, `*.${key}`, `*.*.${key}`]);

export interface LoggerOptions {
  /** "app" o "worker": permite separar los logs de cada proceso. */
  service: string;
  level?: string;
  /** Para pruebas: dónde escribir en lugar de la salida estándar. */
  destination?: DestinationStream;
}

export function createLogger(options: LoggerOptions): Logger {
  return pino(
    {
      level: options.level ?? "info",
      base: { service: options.service },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { level: (label) => ({ level: label }) },
      redact: { paths: REDACT_PATHS, censor: REDACTED_TEXT },
      serializers: { err: serializeError, error: serializeError },
    },
    options.destination,
  );
}
