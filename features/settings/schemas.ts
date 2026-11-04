import { z } from "zod";

import { isValidTimeZone, parseTimeOfDay } from "@/lib/time/zoned";

/* Validación de Configuración (F1-CFG-01, F1-CFG-02). */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Como máximo ${max} caracteres.`)
    .transform((value) => value || null);

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `Escribí ${label}.`).max(max, `Como máximo ${max} caracteres.`);

const phone = z
  .string()
  .trim()
  .max(30, "Como máximo 30 caracteres.")
  .refine((value) => value === "" || /^[0-9+()\-\s]{3,30}$/.test(value), "Revisá el teléfono.")
  .transform((value) => value || null);

const checkbox = z
  .string()
  .optional()
  .transform((value) => value === "on");

export const siteSettingsSchema = z.object({
  name: requiredText("el nombre de la sede", 120),
  address: optionalText(200),
  phone,
  timezone: z.string().trim().refine(isValidTimeZone, "Zona horaria desconocida."),
  emergencyServiceName: optionalText(80),
  emergencyServicePhone: phone,
  emergencyServiceAccount: optionalText(40),
  medicalControlText: optionalText(200),
  familyProvidesText: optionalText(500),
  handoverRequiresConfirmation: checkbox,
});
export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;

const timeOfDay = z
  .string()
  .trim()
  .refine((value) => {
    try {
      parseTimeOfDay(value);
      return /^\d{2}:\d{2}$/.test(value);
    } catch {
      return false;
    }
  }, "Hora en formato 24 h, por ejemplo 06:00.");

export const shiftSchema = z
  .object({
    name: requiredText("el nombre del turno", 40),
    startsAt: timeOfDay,
    endsAt: timeOfDay,
    active: checkbox,
  })
  .refine((value) => value.startsAt !== value.endsAt, {
    path: ["endsAt"],
    message: "El turno tiene que terminar a otra hora.",
  });
export type ShiftInput = z.infer<typeof shiftSchema>;

export const documentTypeSchema = z.object({
  name: requiredText("el nombre del documento", 80),
  description: optionalText(120),
  requiredFor: z.enum(["all", "pami", "private"], { message: "Elegí para quién se pide." }),
  required: checkbox,
  active: checkbox,
});
export type DocumentTypeInput = z.infer<typeof documentTypeSchema>;

/** Para quién se pide un documento, en palabras. */
export const REQUIRED_FOR_LABELS = {
  all: "Todos los pacientes",
  pami: "Solo PAMI",
  private: "Solo privados",
} as const;
