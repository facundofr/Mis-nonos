import { z } from "zod";

import { CONTACT_CHANNELS, DISCARD_REASONS } from "@/db/schema/admission-requests";
import { fields } from "@/features/residents/schemas";

/*
 * Validación de las solicitudes de ingreso (7.3-C3, DC-17, DC-18). La carga
 * manual pide lo mínimo para volver a llamar: nombre del futuro paciente y
 * nombre y teléfono del responsable. El resto se completa después.
 */

const { absentAsEmpty, optionalText, requiredText, phone, nationalId, pastDate } = fields;

export const CHANNEL_LABELS: Record<(typeof CONTACT_CHANNELS)[number], string> = {
  phone: "Teléfono",
  whatsapp: "WhatsApp",
  in_person: "Presencial",
  referral: "Derivación",
  email: "Email",
  other: "Otro",
};

export const STATUS_LABELS = {
  new: "Nueva",
  contacting: "En contacto",
  waitlisted: "En espera",
  converted: "Convertida",
  discarded: "Descartada",
} as const;

export const DISCARD_LABELS: Record<(typeof DISCARD_REASONS)[number], string> = {
  no_vacancy: "Sin vacante",
  requirements: "No cumple los requisitos",
  withdrew: "La familia desistió",
  duplicate: "Duplicada",
  spam: "Spam",
  other: "Otro motivo",
};

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T, message: string) =>
  absentAsEmpty(
    z
      .string()
      .refine((value) => value === "" || (values as readonly string[]).includes(value), message)
      .transform((value) => (value || null) as T[number] | null),
  );

const futureDate = absentAsEmpty(
  z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Revisá la fecha.")
    .transform((value) => value || null),
);

const optionalPhone = phone;

export const requestSchema = z
  .object({
    contactChannel: z.enum(CONTACT_CHANNELS, { message: "Elegí por dónde llegó." }),
    firstName: requiredText("el nombre", 80),
    lastName: requiredText("el apellido", 80),
    nationalId,
    birthDate: pastDate("la fecha de nacimiento"),
    admissionModality: optionalEnum(["pami", "private"], "Elegí la modalidad."),
    coverageType: optionalEnum(["pami", "obra_social", "prepaga", "none"], "Elegí la cobertura."),
    coverageName: optionalText(80),
    coverageMemberNumber: optionalText(40),
    referralInstitution: optionalText(120),
    desiredAdmissionDate: futureDate,
    responsibleName: requiredText("el nombre del responsable", 120),
    responsibleRelationship: optionalText(40),
    responsibleNationalId: nationalId,
    responsiblePhone: optionalPhone.refine((value) => value !== null, "Escribí un teléfono."),
    responsibleEmail: absentAsEmpty(
      z
        .string()
        .trim()
        .toLowerCase()
        .refine((value) => value === "" || z.email().safeParse(value).success, "Revisá el email.")
        .transform((value) => value || null),
    ),
    responsibleAddress: optionalText(200),
    familyMessage: optionalText(1000),
    internalNotes: optionalText(2000),
    // Otros dos familiares opcionales, en orden.
    contact2Name: optionalText(120),
    contact2Relationship: optionalText(40),
    contact2Phone: optionalPhone,
    contact3Name: optionalText(120),
    contact3Relationship: optionalText(40),
    contact3Phone: optionalPhone,
  })
  .superRefine((value, context) => {
    for (const index of [2, 3] as const) {
      const name = value[`contact${index}Name`];
      const contactPhone = value[`contact${index}Phone`];
      if (name && !contactPhone) {
        context.addIssue({
          code: "custom",
          path: [`contact${index}Phone`],
          message: "Escribí el teléfono.",
        });
      }
      if (!name && contactPhone) {
        context.addIssue({
          code: "custom",
          path: [`contact${index}Name`],
          message: "Escribí el nombre.",
        });
      }
    }
    if (value.admissionModality === "pami" && value.coverageType && value.coverageType !== "pami") {
      context.addIssue({
        code: "custom",
        path: ["coverageType"],
        message: "Con modalidad PAMI, la cobertura es PAMI.",
      });
    }
  });
export type RequestInput = z.infer<typeof requestSchema>;

export const statusChangeSchema = z.object({
  status: z.enum(["contacting", "waitlisted"], { message: "Elegí el estado." }),
});

export const discardSchema = z.object({
  discardReason: z.enum(DISCARD_REASONS, { message: "Elegí el motivo." }),
  discardNotes: optionalText(500),
});
export type DiscardInput = z.infer<typeof discardSchema>;

/** Los contactos extra de la solicitud, en orden. */
export function extraContacts(input: RequestInput) {
  return ([2, 3] as const)
    .map((index) => ({
      name: input[`contact${index}Name`],
      relationship: input[`contact${index}Relationship`],
      phone: input[`contact${index}Phone`],
    }))
    .filter((contact): contact is { name: string; relationship: string | null; phone: string } =>
      Boolean(contact.name && contact.phone),
    );
}

/** Desde qué estados se puede pasar a cada uno (DC-18). */
export const ALLOWED_FROM = {
  contacting: ["new", "waitlisted"],
  waitlisted: ["new", "contacting"],
  discarded: ["new", "contacting", "waitlisted"],
  converted: ["new", "contacting", "waitlisted"],
} as const;
