import { z } from "zod";

/*
 * Validación de pacientes, contactos y alergias (7.3-C, 7.3-D, F.7). Los
 * mismos esquemas los usan el ingreso guiado y "Editar paciente" (DC-13).
 */

/** Un campo que no se muestra (y no se envía) cuenta como vacío. */
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

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `Escribí ${label}.`).max(max, `Como máximo ${max} caracteres.`);

const phone = absentAsEmpty(
  z
    .string()
    .trim()
    .max(30, "Como máximo 30 caracteres.")
    .refine((value) => value === "" || /^[0-9+()\-\s.]{6,30}$/.test(value), "Revisá el teléfono.")
    .transform((value) => value || null),
);

const checkbox = z
  .string()
  .optional()
  .transform((value) => value === "on");

/** DNI: 6 a 9 dígitos, con o sin puntos. Se guarda sin puntos. */
const nationalId = absentAsEmpty(
  z
    .string()
    .trim()
    .transform((value) => value.replace(/[.\s]/g, ""))
    .refine((value) => value === "" || /^\d{6,9}$/.test(value), "Revisá el DNI: solo números.")
    .transform((value) => value || null),
);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elegí una fecha.");

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

const pastDate = (label: string) =>
  absentAsEmpty(
    z
      .string()
      .trim()
      .refine((value) => value === "" || isoDate.safeParse(value).success, `Revisá ${label}.`)
      .refine(
        (value) => value === "" || (value >= "1900-01-01" && value <= todayKey()),
        `Revisá ${label}.`,
      )
      .transform((value) => value || null),
  );

const requiredDate = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => isoDate.safeParse(value).success, `Elegí ${label}.`)
    .refine((value) => value >= "1990-01-01", `Revisá ${label}.`);

export const MODALITIES = { pami: "PAMI (internación geriátrica)", private: "Privado" } as const;
export const COVERAGE_TYPES = {
  pami: "PAMI",
  obra_social: "Obra social",
  prepaga: "Prepaga",
  none: "Sin cobertura",
} as const;

/** Paso 1 del ingreso y "Editar paciente": datos personales, cobertura y cuidados. */
export const residentDataSchema = z
  .object({
    firstName: requiredText("el nombre", 80),
    lastName: requiredText("el apellido", 80),
    nationalId,
    birthDate: pastDate("la fecha de nacimiento"),
    birthPlace: optionalText(120),
    previousAddress: optionalText(200),
    roomLabel: optionalText(20),
    admissionDate: requiredDate("la fecha de ingreso"),
    referralInstitution: optionalText(120),
    admissionModality: z.enum(["pami", "private"], { message: "Elegí la modalidad." }),
    coverageType: z.enum(["pami", "obra_social", "prepaga", "none"], {
      message: "Elegí la cobertura.",
    }),
    coverageName: optionalText(80),
    coverageMemberNumber: optionalText(40),
    coveragePlan: optionalText(60),
    primaryPhysicianName: optionalText(120),
    primaryPhysicianPhone: phone,
    specialInstructions: optionalText(1000),
    nationalIdInCustody: checkbox,
  })
  .refine((value) => value.admissionModality !== "pami" || value.coverageType === "pami", {
    path: ["coverageType"],
    message: "Con modalidad PAMI, la cobertura es PAMI.",
  })
  .refine((value) => value.coverageType === "none" || Boolean(value.coverageMemberNumber), {
    path: ["coverageMemberNumber"],
    message: "Escribí el número de beneficiario o de afiliado.",
  });
export type ResidentDataInput = z.infer<typeof residentDataSchema>;

export const RELATIONSHIPS = [
  "Hijo/a",
  "Nieto/a",
  "Cónyuge",
  "Hermano/a",
  "Sobrino/a",
  "Otro familiar",
  "Amigo/a",
  "Apoderado/a",
] as const;

export const contactSchema = z
  .object({
    name: requiredText("el nombre y apellido", 120),
    relationship: optionalText(40),
    nationalId,
    address: optionalText(200),
    phonePrimary: phone,
    phoneMobile: phone,
    phoneWork: phone,
    whatsapp: checkbox,
    email: absentAsEmpty(
      z
        .string()
        .trim()
        .toLowerCase()
        .refine((value) => value === "" || z.email().safeParse(value).success, "Revisá el email.")
        .transform((value) => value || null),
    ),
    emergencyPriority: absentAsEmpty(
      z
        .string()
        .trim()
        .refine((value) => value === "" || /^\d{1,2}$/.test(value), "Elegí el orden.")
        .transform((value) => (value ? Number(value) : null)),
    ),
    isAdmissionResponsible: checkbox,
    isLegalRepresentative: checkbox,
    canReceiveInfo: checkbox,
    canPickUp: checkbox,
    isPayer: checkbox,
    availabilityNotes: optionalText(300),
    verified: checkbox,
  })
  .refine((value) => value.phonePrimary || value.phoneMobile || value.phoneWork, {
    path: ["phonePrimary"],
    message: "Hace falta al menos un teléfono.",
  })
  .refine((value) => !value.isAdmissionResponsible || value.nationalId, {
    path: ["nationalId"],
    message: "El responsable de la internación lleva DNI.",
  })
  .refine((value) => !value.isAdmissionResponsible || value.address, {
    path: ["address"],
    message: "El responsable de la internación lleva domicilio.",
  });
export type ContactInput = z.infer<typeof contactSchema>;

export const allergySchema = z.object({
  substance: requiredText("a qué es alérgico/a", 80),
  reaction: optionalText(120),
  severity: optionalText(40),
});
export type AllergyInput = z.infer<typeof allergySchema>;

export const hospitalizeSchema = z.object({
  place: requiredText("dónde está internado/a", 120),
  since: requiredDate("desde cuándo"),
});

export const returnSchema = z.object({ date: requiredDate("la fecha de vuelta") });

export const DISCHARGE_REASONS = {
  alta: "Alta",
  traslado: "Traslado a otra institución",
  fallecimiento: "Fallecimiento",
  otro: "Otro",
} as const;

export const dischargeSchema = z.object({
  reason: z.enum(["alta", "traslado", "fallecimiento", "otro"], { message: "Elegí el motivo." }),
  date: requiredDate("la fecha de egreso"),
  notes: optionalText(500),
});

/** Piezas de validación compartidas (las usan también las solicitudes de ingreso). */
export const fields = {
  absentAsEmpty,
  optionalText,
  requiredText,
  phone,
  checkbox,
  nationalId,
  pastDate,
};
