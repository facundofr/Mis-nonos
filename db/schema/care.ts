import { sql } from "drizzle-orm";
import {
  boolean,
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
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { appRole, createdAt, primaryId, updatedAt } from "./_shared";
import { users } from "./auth";
import { residents } from "./residents";
import { organizations, sites } from "./tenancy";

/*
 * Seguimiento del cuidado (fase 2 adelantada, docs/decisions/0017):
 * especialidades, profesionales, atenciones (incluidas las de enfermería) y
 * registro de emergencias. Módulo "care".
 *
 * Son datos de salud: además de can() en la app, la base exige el permiso
 * en sus políticas (como el abono, 12.10). Nada se borra: las especialidades
 * y los profesionales se desactivan, las atenciones se anulan con motivo y
 * las emergencias se cierran.
 */

const organizationId = () =>
  uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "restrict" });

const inOrg = sql`organization_id = (select app.current_org_id())`;
const systemOr = (permission: string) =>
  sql`((select app.current_user_id()) is null or (select app.current_user_can(${sql.raw(`'${permission}'`)})))`;

/** Misma residencia y el permiso: uno para leer y otro para escribir. */
function carePolicies(table: string, read: string, write: string) {
  return [
    pgPolicy(`${table}_select`, {
      for: "select",
      to: appRole,
      using: sql`${inOrg} and ${systemOr(read)}`,
    }),
    pgPolicy(`${table}_insert`, {
      for: "insert",
      to: appRole,
      withCheck: sql`${inOrg} and ${systemOr(write)}`,
    }),
    pgPolicy(`${table}_update`, {
      for: "update",
      to: appRole,
      using: sql`${inOrg} and ${systemOr(write)}`,
      withCheck: sql`${inOrg} and ${systemOr(write)}`,
    }),
  ];
}

export const SPECIALTY_NAME_MAX_LENGTH = 60;
export const CARE_TEXT_MAX_LENGTH = 2000;
export const CARE_SHORT_TEXT_MAX_LENGTH = 200;

/** Clave fija de la especialidad que usa la sección Enfermería. */
export const NURSING_SPECIALTY_KEY = "enfermeria";

/**
 * Especialidades (8.7): catálogo de la residencia. `key` marca las que la
 * app necesita reconocer (Enfermería); las demás no tienen clave.
 */
export const specialties = pgTable(
  "specialties",
  {
    id: primaryId(),
    organizationId: organizationId(),
    key: text("key"),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("specialties_organization_name_unique").on(t.organizationId, t.name),
    uniqueIndex("specialties_organization_key_unique")
      .on(t.organizationId, t.key)
      .where(sql`${t.key} is not null`),
    unique("specialties_id_organization_unique").on(t.id, t.organizationId),
    check(
      "specialties_name_check",
      sql`length(trim(${t.name})) between 1 and ${sql.raw(String(SPECIALTY_NAME_MAX_LENGTH))}`,
    ),
    ...carePolicies("specialties", "care.read", "care.manage"),
  ],
);

/**
 * Profesionales (8.6, 5.10): internos o externos, sin usuario. El personal
 * carga lo que informan.
 */
export const professionals = pgTable(
  "professionals",
  {
    id: primaryId(),
    organizationId: organizationId(),
    specialtyId: uuid("specialty_id").notNull(),
    name: text("name").notNull(),
    // "internal" (de la residencia) o "external".
    kind: text("kind").notNull().default("external"),
    licenseNumber: text("license_number"),
    phone: text("phone"),
    institution: text("institution"),
    notes: text("notes"),
    active: boolean("active").notNull().default(true),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("professionals_specialty_idx").on(t.specialtyId),
    unique("professionals_id_organization_unique").on(t.id, t.organizationId),
    foreignKey({
      name: "professionals_specialty_organization_fk",
      columns: [t.specialtyId, t.organizationId],
      foreignColumns: [specialties.id, specialties.organizationId],
    }).onDelete("restrict"),
    check("professionals_kind_check", sql`${t.kind} in ('internal', 'external')`),
    check(
      "professionals_name_check",
      sql`length(trim(${t.name})) between 1 and ${sql.raw(String(CARE_SHORT_TEXT_MAX_LENGTH))}`,
    ),
    ...carePolicies("professionals", "care.read", "care.manage"),
  ],
);

/**
 * Atenciones y visitas (8.7, 6.11), también las de enfermería. No se
 * corrigen: quedan con la autoría de quien las registró (5.7) y, si hubo un
 * error, se anulan con motivo y se registran de nuevo.
 */
export const careEncounters = pgTable(
  "care_encounters",
  {
    id: primaryId(),
    organizationId: organizationId(),
    siteId: uuid("site_id").notNull(),
    residentId: uuid("resident_id").notNull(),
    specialtyId: uuid("specialty_id").notNull(),
    // Nulo: la atendió quien la registra (por ejemplo, enfermería del turno).
    professionalId: uuid("professional_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    // "in_house" (en la residencia) o "external".
    location: text("location").notNull().default("in_house"),
    reason: text("reason").notNull(),
    notes: text("notes"),
    instructions: text("instructions"),
    nextControlOn: date("next_control_on", { mode: "string" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidedBy: uuid("voided_by").references(() => users.id, { onDelete: "restrict" }),
    voidReason: text("void_reason"),
  },
  (t) => [
    index("care_encounters_site_occurred_idx").on(t.siteId, t.occurredAt, t.id),
    index("care_encounters_resident_specialty_idx").on(t.residentId, t.specialtyId, t.occurredAt),
    index("care_encounters_specialty_occurred_idx").on(t.specialtyId, t.occurredAt),
    unique("care_encounters_id_organization_unique").on(t.id, t.organizationId),
    foreignKey({
      name: "care_encounters_site_organization_fk",
      columns: [t.siteId, t.organizationId],
      foreignColumns: [sites.id, sites.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "care_encounters_resident_organization_fk",
      columns: [t.residentId, t.organizationId],
      foreignColumns: [residents.id, residents.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "care_encounters_specialty_organization_fk",
      columns: [t.specialtyId, t.organizationId],
      foreignColumns: [specialties.id, specialties.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "care_encounters_professional_organization_fk",
      columns: [t.professionalId, t.organizationId],
      foreignColumns: [professionals.id, professionals.organizationId],
    }).onDelete("restrict"),
    check("care_encounters_location_check", sql`${t.location} in ('in_house', 'external')`),
    check(
      "care_encounters_reason_check",
      sql`length(trim(${t.reason})) between 1 and ${sql.raw(String(CARE_SHORT_TEXT_MAX_LENGTH))}`,
    ),
    check(
      "care_encounters_texts_check",
      sql`(${t.notes} is null or length(${t.notes}) <= ${sql.raw(String(CARE_TEXT_MAX_LENGTH))})
        and (${t.instructions} is null or length(${t.instructions}) <= ${sql.raw(String(CARE_TEXT_MAX_LENGTH))})`,
    ),
    // Anular exige quién, cuándo y por qué, juntos.
    check(
      "care_encounters_void_check",
      sql`(${t.voidedAt} is null and ${t.voidedBy} is null and ${t.voidReason} is null)
        or (${t.voidedAt} is not null and ${t.voidedBy} is not null and length(trim(${t.voidReason})) between 1 and ${sql.raw(String(CARE_SHORT_TEXT_MAX_LENGTH))})`,
    ),
    ...carePolicies("care_encounters", "care.read", "care.record"),
  ],
);

/**
 * Emergencias registradas (6.9, paso 5): hora, qué pasó, a quién se llamó y
 * si hubo traslado. Quedan abiertas hasta que alguien las cierra con el
 * resultado.
 */
export const emergencies = pgTable(
  "emergencies",
  {
    id: primaryId(),
    organizationId: organizationId(),
    siteId: uuid("site_id").notNull(),
    residentId: uuid("resident_id").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    description: text("description").notNull(),
    calls: text("calls"),
    transferred: boolean("transferred").notNull().default(false),
    transferDestination: text("transfer_destination"),
    // "open" o "closed".
    status: text("status").notNull().default("open"),
    outcome: text("outcome"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedBy: uuid("closed_by").references(() => users.id, { onDelete: "restrict" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("emergencies_site_started_idx").on(t.siteId, t.startedAt, t.id),
    index("emergencies_resident_started_idx").on(t.residentId, t.startedAt),
    index("emergencies_open_idx")
      .on(t.siteId, t.startedAt)
      .where(sql`${t.status} = 'open'`),
    unique("emergencies_id_organization_unique").on(t.id, t.organizationId),
    foreignKey({
      name: "emergencies_site_organization_fk",
      columns: [t.siteId, t.organizationId],
      foreignColumns: [sites.id, sites.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "emergencies_resident_organization_fk",
      columns: [t.residentId, t.organizationId],
      foreignColumns: [residents.id, residents.organizationId],
    }).onDelete("restrict"),
    check("emergencies_status_check", sql`${t.status} in ('open', 'closed')`),
    check(
      "emergencies_description_check",
      sql`length(trim(${t.description})) between 1 and ${sql.raw(String(CARE_TEXT_MAX_LENGTH))}`,
    ),
    check(
      "emergencies_texts_check",
      sql`(${t.calls} is null or length(${t.calls}) <= ${sql.raw(String(CARE_TEXT_MAX_LENGTH))})
        and (${t.outcome} is null or length(${t.outcome}) <= ${sql.raw(String(CARE_TEXT_MAX_LENGTH))})
        and (${t.transferDestination} is null or length(${t.transferDestination}) <= ${sql.raw(String(CARE_SHORT_TEXT_MAX_LENGTH))})`,
    ),
    // Solo hay destino si hubo traslado.
    check("emergencies_transfer_check", sql`${t.transferred} or ${t.transferDestination} is null`),
    // Cerrada = quién y cuándo, juntos.
    check(
      "emergencies_closed_check",
      sql`(${t.status} = 'open' and ${t.closedAt} is null and ${t.closedBy} is null)
        or (${t.status} = 'closed' and ${t.closedAt} is not null and ${t.closedBy} is not null)`,
    ),
    ...carePolicies("emergencies", "emergencies.manage", "emergencies.manage"),
  ],
);
