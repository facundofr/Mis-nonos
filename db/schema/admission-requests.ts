import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { citext, createdAt, primaryId, publicRole, tenantPolicies, updatedAt } from "./_shared";
import { users } from "./auth";
import { admissions } from "./residents";
import { organizations, sites } from "./tenancy";

/*
 * Solicitudes de ingreso (7.3-C3, 11.2, DC-14, DC-18). Una solicitud no
 * crea un paciente: queda en la bandeja hasta que alguien la convierte en
 * un ingreso guiado. Las que no se convierten se borran a los 12 meses de
 * su última actividad (trabajo del worker; DC-14). Nunca se piden
 * diagnósticos, medicación ni fotos de documentos.
 */

export const ADMISSION_REQUEST_STATUSES = [
  "new",
  "contacting",
  "waitlisted",
  "converted",
  "discarded",
] as const;
export type AdmissionRequestStatus = (typeof ADMISSION_REQUEST_STATUSES)[number];

export const CONTACT_CHANNELS = [
  "phone",
  "whatsapp",
  "in_person",
  "referral",
  "email",
  "other",
] as const;
export const DISCARD_REASONS = [
  "no_vacancy",
  "requirements",
  "withdrew",
  "duplicate",
  "spam",
  "other",
] as const;

const list = (values: readonly string[]) => sql.raw(values.map((value) => `'${value}'`).join(", "));

export const admissionRequests = pgTable(
  "admission_requests",
  {
    id: primaryId(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    siteId: uuid("site_id").notNull(),
    // staff = la cargó alguien de la residencia; landing = el formulario público (al final del MVP).
    origin: text("origin").notNull(),
    contactChannel: text("contact_channel"),
    status: text("status").notNull().default("new"),
    // Futuro paciente (pasos 1 y 2 del ingreso, lo mínimo).
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    nationalId: text("national_id"),
    birthDate: date("birth_date", { mode: "string" }),
    admissionModality: text("admission_modality"),
    coverageType: text("coverage_type"),
    coverageName: text("coverage_name"),
    coverageMemberNumber: text("coverage_member_number"),
    referralInstitution: text("referral_institution"),
    desiredAdmissionDate: date("desired_admission_date", { mode: "string" }),
    // Responsable de la internación.
    responsibleName: text("responsible_name").notNull(),
    responsibleRelationship: text("responsible_relationship"),
    responsibleNationalId: text("responsible_national_id"),
    responsiblePhone: text("responsible_phone").notNull(),
    responsibleEmail: citext("responsible_email"),
    responsibleAddress: text("responsible_address"),
    // Otros dos familiares (opcionales), en orden para llamar.
    contact2Name: text("contact2_name"),
    contact2Relationship: text("contact2_relationship"),
    contact2Phone: text("contact2_phone"),
    contact3Name: text("contact3_name"),
    contact3Relationship: text("contact3_relationship"),
    contact3Phone: text("contact3_phone"),
    familyMessage: text("family_message"),
    internalNotes: text("internal_notes"),
    // Obligatorios si viene de la landing (12.9).
    consentAcceptedAt: timestamp("consent_accepted_at", { withTimezone: true }),
    consentTextVersion: text("consent_text_version"),
    // Idempotencia: el mismo envío dos veces no crea dos solicitudes.
    clientRequestId: uuid("client_request_id").notNull(),
    discardReason: text("discard_reason"),
    discardNotes: text("discard_notes"),
    convertedAdmissionId: uuid("converted_admission_id"),
    version: integer("version").notNull().default(1),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "restrict" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    // Última actividad: de acá cuenta el plazo de borrado (DC-14).
    updatedAt: updatedAt(),
  },
  (t) => [
    index("admission_requests_site_status_idx").on(t.siteId, t.status, t.createdAt),
    index("admission_requests_national_id_idx")
      .on(t.organizationId, t.nationalId)
      .where(sql`${t.nationalId} is not null`),
    unique("admission_requests_client_request_unique").on(t.organizationId, t.clientRequestId),
    unique("admission_requests_id_organization_unique").on(t.id, t.organizationId),
    foreignKey({
      name: "admission_requests_site_organization_fk",
      columns: [t.siteId, t.organizationId],
      foreignColumns: [sites.id, sites.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "admission_requests_admission_organization_fk",
      columns: [t.convertedAdmissionId, t.organizationId],
      foreignColumns: [admissions.id, admissions.organizationId],
    }).onDelete("restrict"),
    check("admission_requests_origin_check", sql`${t.origin} in ('staff', 'landing')`),
    check(
      "admission_requests_status_check",
      sql`${t.status} in (${list(ADMISSION_REQUEST_STATUSES)})`,
    ),
    check(
      "admission_requests_channel_check",
      sql`${t.contactChannel} is null or ${t.contactChannel} in (${list(CONTACT_CHANNELS)})`,
    ),
    check(
      "admission_requests_modality_check",
      sql`${t.admissionModality} is null or ${t.admissionModality} in ('pami', 'private')`,
    ),
    check(
      "admission_requests_coverage_check",
      sql`${t.coverageType} is null or ${t.coverageType} in ('pami', 'obra_social', 'prepaga', 'none')`,
    ),
    check(
      "admission_requests_names_check",
      sql`length(trim(${t.firstName})) > 0 and length(trim(${t.lastName})) > 0 and length(trim(${t.responsibleName})) > 0`,
    ),
    // Descartada lleva motivo; convertida lleva el ingreso.
    check(
      "admission_requests_discard_check",
      sql`(${t.status} = 'discarded') = (${t.discardReason} is not null)
        and (${t.discardReason} is null or ${t.discardReason} in (${list(DISCARD_REASONS)}))`,
    ),
    check(
      "admission_requests_converted_check",
      sql`(${t.status} = 'converted') = (${t.convertedAdmissionId} is not null)`,
    ),
    check(
      "admission_requests_consent_check",
      sql`${t.origin} <> 'landing' or (${t.consentAcceptedAt} is not null and ${t.consentTextVersion} is not null)`,
    ),
    ...tenantPolicies("admission_requests"),
    // Formulario público (12.9): solo agrega solicitudes nuevas de la landing,
    // sin autor ni notas internas. No hay política de lectura para este rol.
    pgPolicy("admission_requests_public_insert", {
      for: "insert",
      to: publicRole,
      withCheck: sql`organization_id = (select app.current_org_id())
        and ${t.origin} = 'landing'
        and ${t.status} = 'new'
        and ${t.createdBy} is null
        and ${t.updatedBy} is null
        and ${t.internalNotes} is null
        and ${t.convertedAdmissionId} is null
        and ${t.discardReason} is null
        and ${t.version} = 1`,
    }),
  ],
);
