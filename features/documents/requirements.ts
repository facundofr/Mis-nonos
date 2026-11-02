/*
 * Qué documentos del legajo corresponden a cada paciente según su
 * modalidad (7.3-C2, F1-ING-03).
 */

export interface DocumentTypeLike {
  requiredFor: string;
  required: boolean;
  active: boolean;
}

/** Los documentos que se piden a un paciente de esta modalidad (activos). */
export function documentsFor<T extends DocumentTypeLike>(
  types: readonly T[],
  modality: string,
): T[] {
  return types.filter(
    (type) => type.active && (type.requiredFor === "all" || type.requiredFor === modality),
  );
}

/** Los obligatorios que todavía faltan. */
export function missingRequired<T extends DocumentTypeLike & { id: string }>(
  types: readonly T[],
  modality: string,
  uploadedTypeIds: ReadonlySet<string>,
): T[] {
  return documentsFor(types, modality).filter(
    (type) => type.required && !uploadedTypeIds.has(type.id),
  );
}
