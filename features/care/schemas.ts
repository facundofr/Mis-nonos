import { z } from "zod";

import {
  CARE_SHORT_TEXT_MAX_LENGTH,
  CARE_TEXT_MAX_LENGTH,
  SPECIALTY_NAME_MAX_LENGTH,
} from "@/db/schema/care";

/*
 * Validación del seguimiento del cuidado (docs/decisions/0017): especialidades,
 * profesionales, atenciones y emergencias. Los mismos esquemas validan en el
 * servidor y devuelven los errores por campo.
 */

/** Un campo que no se envía cuenta como vacío. */
const absentAsEmpty = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === undefined || value === null ? "" : value), schema);

const optionalText = (max: number) =>
  absentAsEmpty(
    z
      .string()
      .trim()
      .max(max, `Como máximo ${max} caracteres.`)
      .transform((value) => value || null),
  );

const requiredText = (message: string, max: number) =>
  absentAsEmpty(z.string().trim().min(1, message).max(max, `Como máximo ${max} caracteres.`));

const checkbox = z
  .string()
  .optional()
  .transform((value) => value === "on");

const phone = absentAsEmpty(
  z
    .string()
    .trim()
    .max(30, "Como máximo 30 caracteres.")
    .refine((value) => value === "" || /^[0-9+()\-\s.]{6,30}$/.test(value), "Revisá el teléfono.")
    .transform((value) => value || null),
);

const optionalId = absentAsEmpty(
  z
    .string()
    .refine((value) => value === "" || z.uuid().safeParse(value).success, "Elegí una opción.")
    .transform((value) => value || null),
);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const requiredDate = (message: string) =>
  absentAsEmpty(
    z
      .string()
      .trim()
      .refine((value) => ISO_DATE.test(value) && value >= "2000-01-01", message),
  );

const requiredTime = (message: string) =>
  absentAsEmpty(
    z
      .string()
      .trim()
      .refine((value) => TIME.test(value), message),
  );

const optionalDate = (message: string) =>
  absentAsEmpty(
    z
      .string()
      .trim()
      .refine((value) => value === "" || (ISO_DATE.test(value) && value >= "2000-01-01"), message)
      .transform((value) => value || null),
  );

export const PROFESSIONAL_KINDS = {
  external: "Externo",
  internal: "De la residencia",
} as const;
export type ProfessionalKind = keyof typeof PROFESSIONAL_KINDS;

export const ENCOUNTER_LOCATIONS = {
  in_house: "En la residencia",
  external: "Fuera de la residencia",
} as const;
export type EncounterLocation = keyof typeof ENCOUNTER_LOCATIONS;

export const specialtySchema = z.object({
  name: requiredText("Escribí el nombre.", SPECIALTY_NAME_MAX_LENGTH),
  active: checkbox,
});
export type SpecialtyInput = z.infer<typeof specialtySchema>;

export const professionalSchema = z.object({
  name: requiredText("Escribí el nombre.", CARE_SHORT_TEXT_MAX_LENGTH),
  specialtyId: absentAsEmpty(z.uuid("Elegí la especialidad.")),
  kind: z.enum(["external", "internal"], "Elegí si es de la residencia o externo."),
  licenseNumber: optionalText(40),
  phone,
  institution: optionalText(CARE_SHORT_TEXT_MAX_LENGTH),
  notes: optionalText(500),
  active: checkbox,
});
export type ProfessionalInput = z.infer<typeof professionalSchema>;

export const encounterSchema = z.object({
  specialtyId: absentAsEmpty(z.uuid("Elegí la especialidad.")),
  professionalId: optionalId,
  occurredDate: requiredDate("Elegí la fecha."),
  occurredTime: requiredTime("Elegí la hora."),
  location: z.enum(["in_house", "external"], "Elegí dónde fue."),
  reason: requiredText("Escribí el motivo.", CARE_SHORT_TEXT_MAX_LENGTH),
  notes: optionalText(CARE_TEXT_MAX_LENGTH),
  instructions: optionalText(CARE_TEXT_MAX_LENGTH),
  nextControlOn: optionalDate("Revisá la fecha del próximo control."),
});
export type EncounterInput = z.infer<typeof encounterSchema>;

export const voidEncounterSchema = z.object({
  voidReason: requiredText("Escribí por qué se anula.", CARE_SHORT_TEXT_MAX_LENGTH),
});
export type VoidEncounterInput = z.infer<typeof voidEncounterSchema>;

export const emergencySchema = z.object({
  startedDate: requiredDate("Elegí la fecha."),
  startedTime: requiredTime("Elegí la hora."),
  description: requiredText("Escribí qué pasó.", CARE_TEXT_MAX_LENGTH),
  calls: optionalText(CARE_TEXT_MAX_LENGTH),
  transferred: checkbox,
  transferDestination: optionalText(CARE_SHORT_TEXT_MAX_LENGTH),
});
export type EmergencyInput = z.infer<typeof emergencySchema>;

export const closeEmergencySchema = z.object({
  calls: optionalText(CARE_TEXT_MAX_LENGTH),
  transferred: checkbox,
  transferDestination: optionalText(CARE_SHORT_TEXT_MAX_LENGTH),
  outcome: requiredText("Escribí cómo terminó.", CARE_TEXT_MAX_LENGTH),
});
export type CloseEmergencyInput = z.infer<typeof closeEmergencySchema>;
