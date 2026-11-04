/*
 * Tipos de cambio del Registro de cambios (docs/decisions/0021). Se deducen
 * del final de la acción auditada; lo que no es baja, cambio ni apertura es
 * un alta. Puro: lo usan la consulta y las pruebas.
 */

export const LOG_GROUPS = {
  altas: "Altas y registros",
  cambios: "Cambios",
  bajas: "Bajas y anulaciones",
  aperturas: "Aperturas de fichas y documentos",
} as const;
export type LogGroup = keyof typeof LOG_GROUPS;

/** Expresiones (POSIX, también válidas en JavaScript) por grupo, sin "altas". */
export const LOG_GROUP_PATTERNS: Record<Exclude<LogGroup, "altas">, string> = {
  bajas: "(voided|discarded|revoked|disabled|removed|cancelled|purged|closed)$",
  aperturas: "(viewed|pdf_generated)$",
  cambios: "(updated|changed|corrected|rotated|password_reset|reactivated|resolved|returned)$",
};

export function logGroupOf(action: string): LogGroup {
  for (const group of ["bajas", "aperturas", "cambios"] as const) {
    if (new RegExp(LOG_GROUP_PATTERNS[group]).test(action)) return group;
  }
  return "altas";
}

export function isLogGroup(value: unknown): value is LogGroup {
  return typeof value === "string" && value in LOG_GROUPS;
}
