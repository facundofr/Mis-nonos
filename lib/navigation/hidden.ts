/*
 * Secciones que la residencia no usa por ahora: no aparecen en el menú ni en
 * Inicio, pero sus pantallas siguen abriendo por su dirección. Para volver a
 * mostrar una, se la quita de acá.
 */
const HIDDEN_SECTIONS = new Set(["turno", "especialidades"]);

export function isSectionHidden(key: string): boolean {
  return HIDDEN_SECTIONS.has(key);
}
