/*
 * Qué cambió en un registro, para la auditoría (DC-04 confirmada el
 * 01/11/2026): valor anterior y nuevo de cada campo modificado. La
 * auditoría está protegida por RLS y la ve solo quien tiene permiso (F.3).
 */

export interface FieldChange {
  antes: unknown;
  despues: unknown;
}

export type ChangeSet = Record<string, FieldChange>;

export const REDACTED = "[oculto]";

/** Campos que nunca se copian a la auditoría, aunque cambien. */
const REDACTED_FIELDS: ReadonlySet<string> = new Set([
  "password",
  "passwordHash",
  "token",
  "tokenHash",
  "secret",
  "backupCodes",
]);

/** Campos técnicos que no se comparan cuando no se indica la lista de campos. */
const IGNORED_FIELDS: ReadonlySet<string> = new Set(["createdAt", "updatedAt"]);

/**
 * Compara dos versiones de un registro y devuelve los campos que cambiaron,
 * o null si no cambió nada. `before` nulo = alta; `after` nulo = baja.
 * Con `fields`, compara solo esos campos.
 */
export function diffChanges(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  fields?: readonly string[],
): ChangeSet | null {
  const keys =
    fields ??
    [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])].filter(
      (key) => !IGNORED_FIELDS.has(key),
    );

  const changes: ChangeSet = {};
  for (const key of keys) {
    const previous = normalize(before?.[key]);
    const next = normalize(after?.[key]);
    if (JSON.stringify(previous) === JSON.stringify(next)) continue;
    changes[key] = REDACTED_FIELDS.has(key)
      ? { antes: REDACTED, despues: REDACTED }
      : { antes: previous, despues: next };
  }
  return Object.keys(changes).length > 0 ? changes : null;
}

function normalize(value: unknown): unknown {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}
