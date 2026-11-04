import * as schema from "@/db/schema";
import type { Transaction } from "@/lib/db/client";

/*
 * Valores iniciales de una residencia nueva (DC-12): turnos, documentos del
 * legajo y especialidades. Salen del diseño y del legajo real de Mis Nonos
 * (Apéndice E). Después se cambian desde Configuración.
 */

export const DEFAULT_SHIFTS = [
  { name: "Mañana", startsAt: "06:00", endsAt: "14:00" },
  { name: "Tarde", startsAt: "14:00", endsAt: "22:00" },
  { name: "Noche", startsAt: "22:00", endsAt: "06:00" },
] as const;

/** Especialidades (8.7, docs/decisions/0017): se renombran o desactivan libremente. */
export const DEFAULT_SPECIALTIES = [
  "Medicina clínica",
  "Kinesiología",
  "Nutrición",
  "Psicología",
  "Psiquiatría",
  "Terapia ocupacional",
  "Fonoaudiología",
  "Odontología",
  "Podología",
] as const;

export const DEFAULT_DOCUMENT_TYPES = [
  {
    key: "ficha_ingreso",
    name: "Ficha de ingreso",
    description: "Firmada por el responsable",
    requiredFor: "all",
    required: true,
  },
  {
    key: "obligaciones",
    name: "Obligaciones de las partes",
    description: "Reglamento firmado",
    requiredFor: "all",
    required: true,
  },
  {
    key: "consentimiento_pami",
    name: "Consentimiento PAMI",
    description: "Formulario oficial firmado",
    requiredFor: "pami",
    required: true,
  },
  {
    key: "acta_compromiso_pami",
    name: "Acta compromiso PAMI",
    description: "Formulario oficial firmado",
    requiredFor: "pami",
    required: true,
  },
  {
    key: "dni_custodia",
    name: "DNI original en custodia",
    description: "Foto del frente y del dorso",
    requiredFor: "all",
    required: true,
  },
  {
    key: "credencial_pami",
    name: "Credencial PAMI",
    description: "Foto",
    requiredFor: "pami",
    required: true,
  },
  {
    key: "estudios_previos",
    name: "Estudios previos",
    description: "Análisis, placas, informes",
    requiredFor: "all",
    required: false,
  },
  {
    key: "documentacion_medica_previa",
    name: "Documentación médica o psiquiátrica previa",
    description: "La pide PAMI para la entrevista",
    requiredFor: "all",
    required: false,
  },
] as const satisfies readonly {
  key: string;
  name: string;
  description: string;
  requiredFor: "all" | "pami" | "private";
  required: boolean;
}[];

/** Carga los catálogos iniciales de una residencia y su primera sede. */
export async function seedOrganizationDefaults(
  tx: Transaction,
  input: { organizationId: string; siteId: string },
): Promise<void> {
  await tx.insert(schema.shifts).values(
    DEFAULT_SHIFTS.map((shift, index) => ({
      organizationId: input.organizationId,
      siteId: input.siteId,
      name: shift.name,
      startsAt: shift.startsAt,
      endsAt: shift.endsAt,
      position: index + 1,
    })),
  );
  await tx.insert(schema.documentTypes).values(
    DEFAULT_DOCUMENT_TYPES.map((type, index) => ({
      organizationId: input.organizationId,
      ...type,
      position: index + 1,
    })),
  );
  await tx.insert(schema.specialties).values(
    DEFAULT_SPECIALTIES.map((name, index) => ({
      organizationId: input.organizationId,
      name,
      position: index + 1,
    })),
  );
}
