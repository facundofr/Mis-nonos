import { z } from "zod";

import { NOTE_MAX_LENGTH, RESOLUTION_MAX_LENGTH } from "@/db/schema/notes";

/*
 * Validación de novedades (7.3-F, F.4). El mismo esquema valida la nueva
 * novedad y la corrección.
 */

const checkbox = z
  .string()
  .optional()
  .transform((value) => value === "on");

export const noteSchema = z.object({
  categoryId: z.uuid("Elegí una categoría."),
  content: z
    .string()
    .trim()
    .min(1, "Escribí qué pasó.")
    .max(NOTE_MAX_LENGTH, `Como máximo ${NOTE_MAX_LENGTH} caracteres.`),
  followUp: checkbox,
});
export type NoteInput = z.infer<typeof noteSchema>;

/** "general" o el id de un paciente. */
export const noteSubjectSchema = z.union([z.literal("general"), z.uuid()]);

export const resolveSchema = z.object({
  resolutionNote: z
    .string()
    .trim()
    .max(RESOLUTION_MAX_LENGTH, `Como máximo ${RESOLUTION_MAX_LENGTH} caracteres.`)
    .optional()
    .transform((value) => value || null),
});
export type ResolveInput = z.infer<typeof resolveSchema>;

/** Plazo para que el autor corrija su novedad (F.4). */
export const EDIT_WINDOW_HOURS = 24;

export function canStillEdit(createdAt: Date, now: Date): boolean {
  return now.getTime() - createdAt.getTime() < EDIT_WINDOW_HOURS * 3600 * 1000;
}
