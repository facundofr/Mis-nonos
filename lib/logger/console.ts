import { formatSafeError, scrubText, serializeError } from "./scrub";

/*
 * Next.js escribe por su cuenta los errores de las pantallas en la consola
 * (console.error). Esos errores pueden traer los parámetros de una consulta
 * de Drizzle. En producción, la consola pasa por la misma limpieza que los
 * logs (instrumentation.ts).
 */

const INSTALLED = Symbol.for("residencia360.consoleRedaction");

/** Limpia un argumento de console.*: errores y textos; el resto queda igual. */
export function redactConsoleArgument(argument: unknown): unknown {
  if (argument instanceof Error) return formatSafeError(serializeError(argument));
  if (typeof argument === "string") return scrubText(argument);
  return argument;
}

export function installConsoleRedaction(target: Console = console): void {
  const marked = target as Console & { [INSTALLED]?: boolean };
  if (marked[INSTALLED]) return;
  marked[INSTALLED] = true;

  for (const method of ["error", "warn", "info", "log"] as const) {
    const original = target[method].bind(target);
    target[method] = (...args: unknown[]) => original(...args.map(redactConsoleArgument));
  }
}
