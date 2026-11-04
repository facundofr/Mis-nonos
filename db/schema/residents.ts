import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { citext, createdAt, primaryId, tenantPolicies, updatedAt } from "./_shared";
import { users } from "./auth";
import { organizations, sites } from "./tenancy";

/*
 * Pacientes (residentes), su cobertura, alergias y contactos (7.3-C, 7.3-D,
 * 11.2). Nada se borra (E6): los pacientes egresan, las alergias se
 * descartan y los contactos se desactivan. El historial de cada cambio
 * queda en audit_events (valores anteriores y nuevos, DC-04).
 */

const organizationId = () =>
  uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "restrict" });

const createdBy = () => uuid("created_by").references(() => users.id, { onDelete: "restrict" });
const updatedBy = () => uuid("updated_by").references(() => users.id, { onDelete: "restrict" });

export const RESIDENT_STATUSES = [
  // Ingreso guiado sin confirmar (F.4): no aparece en listas, búsqueda,
  // emergencia ni traspaso.
  "admission_draft",
  "admission_cancelled",
  "active",
  // Internado fuera (hospital, clínica): sigue siendo paciente de la residencia.
  "hospitalized",
  "discharged",
] as const;
export type ResidentStatus = (typeof RESIDENT_STATUSES)[number];

export const residents = pgTable(
  "residents",
  {
    id: primaryId(),
    organizationId: organizationId(),
    siteId: uuid("site_id").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    nationalId: text("national_id"),
    birthDate: date("birth_date"),
    birthPlace: text("birth_place"),
    previousAddress: text("previous_address"),
    roomLabel: text("room_label"),
    admissionDate: date("admission_date"),
    referralInstitution: text("referral_institution"),
    // PAMI (internación geriátrica) o privado (7.3-C).
    admissionModality: text("admission_modality").notNull().default("private"),
    // Cobertura vigente; el historial queda en la auditoría (docs/decisions/0008).
    coverageType: text("coverage_type").notNull().default("none"),
    coverageName: text("coverage_name"),
    coverageMemberNumber: text("coverage_member_number"),
    coveragePlan: text("coverage_plan"),
    // DNI original en custodia de la residencia (Apéndice E).
    nationalIdInCustody: boolean("national_id_in_custody").notNull().default(false),
    primaryPhysicianName: text("primary_physician_name"),
    primaryPhysicianPhone: text("primary_physician_phone"),
    specialInstructions: text("special_instructions"),
    status: text("status").notNull().default("admission_draft"),
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true }).notNull().defaultNow(),
    // Internado fuera: dónde y desde cuándo (F.4).
    hospitalizationPlace: text("hospitalization_place"),
    hospitalizedSince: date("hospitalized_since"),
    // Egreso sin borrado (F1-RES-05).
    dischargeDate: date("discharge_date"),
    dischargeReason: text("discharge_reason"),
    dischargeNotes: text("discharge_notes"),
    // Texto para buscar sin acentos ni mayúsculas (F1-STK-05). Lo calcula la base.
    searchText: text("search_text").generatedAlwaysAs(
      sql`app.normalize_search(first_name || ' ' || last_name || ' ' || coalesce(room_label, '') || ' ' || coalesce(national_id, ''))`,
    ),
    // Control de ediciones simultáneas: cada cambio suma 1.
    version: integer("version").notNull().default(1),
    createdBy: createdBy(),
    updatedBy: updatedBy(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("residents_organization_status_idx").on(t.organizationId, t.status, t.lastName),
    index("residents_search_idx").using("gin", t.searchText.op("gin_trgm_ops")),
    unique("residents_id_organization_unique").on(t.id, t.organizationId),
    foreignKey({
      name: "residents_site_organization_fk",
      columns: [t.siteId, t.organizationId],
      foreignColumns: [sites.id, sites.organizationId],
    }).onDelete("restrict"),
    check(
      "residents_status_check",
      sql`${t.status} in ('admission_draft', 'admission_cancelled', 'active', 'hospitalized', 'discharged')`,
    ),
    check("residents_modality_check", sql`${t.admissionModality} in ('pami', 'private')`),
    check(
      "residents_coverage_type_check",
      sql`${t.coverageType} in ('pami', 'obra_social', 'prepaga', 'none')`,
    ),
    check(
      "residents_discharge_check",
      sql`(${t.status} = 'discharged') = (${t.dischargeDate} is not null and ${t.dischargeReason} is not null)`,
    ),
    check(
      "residents_discharge_reason_check",
      sql`${t.dischargeReason} is null or ${t.dischargeReason} in ('alta', 'traslado', 'fallecimiento', 'otro')`,
    ),
    check(
      "residents_hospitalized_check",
      sql`(${t.status} = 'hospitalized') = (${t.hospitalizationPlace} is not null)`,
    ),
    check(
      "residents_names_check",
      sql`length(trim(${t.firstName})) > 0 and length(trim(${t.lastName})) > 0`,
    ),
    ...tenantPolicies("residents"),
  ],
);

/** Alergias (7.3-C): tabla desde el MVP para tener autoría e historial (11.2). */
export const residentAllergies = pgTable(
  "resident_allergies",
  {
    id: primaryId(),
    organizationId: organizationId(),
    residentId: uuid("resident_id").notNull(),
    substance: text("substance").notNull(),
    reaction: text("reaction"),
    // Texto que define la residencia (11.2).
    severity: text("severity"),
    status: text("status").notNull().default("active"),
    createdBy: createdBy(),
    updatedBy: updatedBy(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("resident_allergies_resident_idx").on(t.residentId),
    foreignKey({
      name: "resident_allergies_resident_organization_fk",
      columns: [t.residentId, t.organizationId],
      foreignColumns: [residents.id, residents.organizationId],
    }).onDelete("restrict"),
    check("resident_allergies_status_check", sql`${t.status} in ('active', 'discarded')`),
    check("resident_allergies_substance_check", sql`length(trim(${t.substance})) > 0`),
    ...tenantPolicies("resident_allergies"),
  ],
);

/**
 * Contactos familiares y de emergencia (7.3-D, 11.2). Uno solo puede ser el
 * responsable de la internación (restricción en la base).
 */
export const residentContacts = pgTable(
  "resident_contacts",
  {
    id: primaryId(),
    organizationId: organizationId(),
    residentId: uuid("resident_id").notNull(),
    name: text("name").notNull(),
    relationship: text("relationship"),
    nationalId: text("national_id"),
    address: text("address"),
    phonePrimary: text("phone_primary"),
    phoneMobile: text("phone_mobile"),
    phoneWork: text("phone_work"),
    // Tiene WhatsApp en el celular.
    whatsapp: boolean("whatsapp").notNull().default(false),
    email: citext("email"),
    // Orden para llamar en una emergencia (1 = primero); nulo = no se llama.
    emergencyPriority: integer("emergency_priority"),
    isAdmissionResponsible: boolean("is_admission_responsible").notNull().default(false),
    isLegalRepresentative: boolean("is_legal_representative").notNull().default(false),
    canReceiveInfo: boolean("can_receive_info").notNull().default(true),
    canPickUp: boolean("can_pick_up").notNull().default(false),
    availabilityNotes: text("availability_notes"),
    lastVerifiedAt: date("last_verified_at"),
    active: boolean("active").notNull().default(true),
    createdBy: createdBy(),
    updatedBy: updatedBy(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("resident_contacts_resident_idx").on(t.residentId, t.emergencyPriority),
    uniqueIndex("resident_contacts_one_responsible")
      .on(t.residentId)
      .where(sql`${t.isAdmissionResponsible} and ${t.active}`),
    foreignKey({
      name: "resident_contacts_resident_organization_fk",
      columns: [t.residentId, t.organizationId],
      foreignColumns: [residents.id, residents.organizationId],
    }).onDelete("restrict"),
    check("resident_contacts_name_check", sql`length(trim(${t.name})) > 0`),
    check(
      "resident_contacts_priority_check",
      sql`${t.emergencyPriority} is null or ${t.emergencyPriority} between 1 and 99`,
    ),
    check(
      "resident_contacts_phone_check",
      sql`not ${t.active} or coalesce(${t.phonePrimary}, ${t.phoneMobile}, ${t.phoneWork}) is not null`,
    ),
    ...tenantPolicies("resident_contacts"),
  ],
);

/** Ingreso guiado en 4 pasos (7.3-C2): el borrador se retoma desde "Ingresos en curso". */
export const admissions = pgTable(
  "admissions",
  {
    id: primaryId(),
    organizationId: organizationId(),
    siteId: uuid("site_id").notNull(),
    residentId: uuid("resident_id").notNull(),
    // Último paso completado (1 a 4).
    currentStep: integer("current_step").notNull().default(1),
    status: text("status").notNull().default("draft"),
    confirmedBy: uuid("confirmed_by").references(() => users.id, { onDelete: "restrict" }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelledBy: uuid("cancelled_by").references(() => users.id, { onDelete: "restrict" }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdBy: createdBy(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("admissions_organization_status_idx").on(t.organizationId, t.status),
    uniqueIndex("admissions_resident_unique").on(t.residentId),
    unique("admissions_id_organization_unique").on(t.id, t.organizationId),
    foreignKey({
      name: "admissions_resident_organization_fk",
      columns: [t.residentId, t.organizationId],
      foreignColumns: [residents.id, residents.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "admissions_site_organization_fk",
      columns: [t.siteId, t.organizationId],
      foreignColumns: [sites.id, sites.organizationId],
    }).onDelete("restrict"),
    check("admissions_status_check", sql`${t.status} in ('draft', 'confirmed', 'cancelled')`),
    check("admissions_step_check", sql`${t.currentStep} between 1 and 4`),
    ...tenantPolicies("admissions"),
  ],
);
