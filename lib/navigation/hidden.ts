/*
 * Secciones que la residencia no usa por ahora. No aparecen en el menú, en
 * Inicio ni en la guía. Novedades y Enfermería, además, responden "no
 * encontrada" (su layout.tsx). El código y los datos se conservan: para
 * volver a mostrar una, se la quita de acá.
 * (Abonos se apaga como módulo en la base, migración 0041.)
 */
const HIDDEN_SECTIONS = new Set(["turno", "especialidades", "novedades", "enfermeria"]);

export function isSectionHidden(key: string): boolean {
  return HIDDEN_SECTIONS.has(key);
}
