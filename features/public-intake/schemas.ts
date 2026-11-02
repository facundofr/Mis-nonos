import { z } from "zod";

import { fields } from "@/features/residents/schemas";

/*
 * Formulario público de solicitud de ingreso (7.3-C3, 12.9, DC-17). Pide lo
 * mínimo y con límites más cortos que la carga manual: nunca diagnósticos,
 * medicación ni fotos de documentos. Obligatorios (propuesta de DC-17):
 * nombre, apellido, nacimiento y modalidad del futuro paciente, y nombre y
 * teléfono del responsable, más la aceptación del aviso de privacidad.
 */

const { absentAsEmpty, optionalText, requiredText, phone, nationalId, pastDate } = fields;

const choice = <T extends readonly [string, ...string[]]>(values: T, message: string) =>
  absentAsEmpty(
    z
      .string()
      .refine((value) => value === "" || (values as readonly string[]).includes(value), message)
      .transform((value) => (value || null) as T[number] | null),
  );

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

/** Mismo formato que el resto de la app: AAAA-MM-DD en la hora de Argentina. */
function todayKey(now = new Date()): string {
  return now.toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });
}

export const PUBLIC_MESSAGE_MAX_LENGTH = 600;

export const publicRequestSchema = z
  .object({
    firstName: requiredText("el nombre", 60),
    lastName: requiredText("el apellido", 60),
    nationalId,
    birthDate: pastDate("la fecha de nacimiento").refine(
      (value) => value !== null,
      "Escribí la fecha de nacimiento.",
    ),
    admissionModality: z.enum(["pami", "private"], { message: "Elegí la modalidad." }),
    coverageType: choice(["pami", "obra_social", "prepaga", "none"], "Elegí la cobertura."),
    coverageName: optionalText(60),
    coverageMemberNumber: optionalText(40),
    desiredAdmissionDate: absentAsEmpty(
      z
        .string()
        .trim()
        .refine(
          (value) => value === "" || (isoDate.test(value) && value >= todayKey()),
          "Elegí una fecha desde hoy.",
        )
        .transform((value) => value || null),
    ),
    responsibleName: requiredText("tu nombre y apellido", 100),
    responsibleRelationship: optionalText(40),
    responsiblePhone: phone.refine((value) => value !== null, "Escribí un teléfono."),
    responsibleEmail: absentAsEmpty(
      z
        .string()
        .trim()
        .toLowerCase()
        .max(120, "Como máximo 120 caracteres.")
        .refine((value) => value === "" || z.email().safeParse(value).success, "Revisá el email.")
        .transform((value) => value || null),
    ),
    contact2Name: optionalText(100),
    contact2Relationship: optionalText(40),
    contact2Phone: phone,
    familyMessage: optionalText(PUBLIC_MESSAGE_MAX_LENGTH),
    consent: z.literal("on", {
      message: "Para enviar la solicitud, aceptá el aviso de privacidad.",
    }),
  })
  .superRefine((value, context) => {
    if (value.contact2Name && !value.contact2Phone) {
      context.addIssue({
        code: "custom",
        path: ["contact2Phone"],
        message: "Escribí el teléfono.",
      });
    }
    if (!value.contact2Name && value.contact2Phone) {
      context.addIssue({ code: "custom", path: ["contact2Name"], message: "Escribí el nombre." });
    }
    if (value.admissionModality === "pami" && value.coverageType && value.coverageType !== "pami") {
      context.addIssue({
        code: "custom",
        path: ["coverageType"],
        message: "Con modalidad PAMI, la cobertura es PAMI.",
      });
    }
  })
  .transform(({ consent: _consent, ...rest }) => rest);
export type PublicRequestInput = z.infer<typeof publicRequestSchema>;

/** Campos del paso 1 (futuro paciente); el resto va en el paso 2. */
export const STEP_ONE_FIELDS = [
  "firstName",
  "lastName",
  "nationalId",
  "birthDate",
  "admissionModality",
  "coverageType",
  "coverageName",
  "coverageMemberNumber",
  "desiredAdmissionDate",
] as const;

/** Dirección pública de la residencia: minúsculas, números y guiones. */
export const PUBLIC_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const publicIntakeSettingsSchema = z
  .object({
    publicIntakeEnabled: z
      .string()
      .optional()
      .transform((value) => value === "on"),
    publicSlug: z
      .string()
      .trim()
      .toLowerCase()
      .max(60, "Como máximo 60 caracteres.")
      .refine(
        (value) => value === "" || (value.length >= 3 && PUBLIC_SLUG_PATTERN.test(value)),
        "Entre 3 y 60 letras minúsculas, números o guiones (por ejemplo, mis-nonos).",
      )
      .transform((value) => value || null),
    publicIntro: z
      .string()
      .trim()
      .max(600, "Como máximo 600 caracteres.")
      .transform((value) => value || null),
  })
  .superRefine((value, context) => {
    if (value.publicIntakeEnabled && !value.publicSlug) {
      context.addIssue({
        code: "custom",
        path: ["publicSlug"],
        message: "Para publicar el formulario, elegí la dirección.",
      });
    }
  });
export type PublicIntakeSettingsInput = z.infer<typeof publicIntakeSettingsSchema>;
