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
  uuid,
} from "drizzle-orm/pg-core";

import { createdAt, primaryId, tenantPolicies, updatedAt } from "./_shared";
import { users } from "./auth";
import { noteCategories, shifts } from "./catalogs";
import { residents } from "./residents";
import { organizations, sites } from "./tenancy";

/*
 * Novedades (7.3-F, F.4, F.5). Una novedad es de un paciente o "General"
 * (resident_id nulo). No se borra: el autor la corrige hasta 24 h después
 * y cada corrección es una versión nueva en note_versions. Si pide
 * seguimiento, queda pendiente hasta que alguien la resuelve (DC-03: sin
 * responsable asignado; la ve todo el turno).
 */

export const NOTE_MAX_LENGTH = 2000;
export const RESOLUTION_MAX_LENGTH = 500;

export const residentNotes = pgTable(
  "resident_notes",
  {
    id: primaryId(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    siteId: uuid("site_id").notNull(),
    // Nulo = novedad general.
    residentId: uuid("resident_id"),
    categoryId: uuid("category_id").notNull(),
    // Versión vigente (las anteriores, en note_versions).
    content: text("content").notNull(),
    version: integer("version").notNull().default(1),
    followUp: boolean("follow_up").notNull().default(false),
    // Turno en que se registró, según el reloj (nulo si a esa hora no había turno).
    shiftId: uuid("shift_id"),
    shiftDate: date("shift_date", { mode: "string" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "restrict" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionNote: text("resolution_note"),
  },
  (t) => [
    index("resident_notes_site_created_idx").on(t.siteId, t.createdAt, t.id),
    index("resident_notes_resident_created_idx").on(t.residentId, t.createdAt, t.id),
    index("resident_notes_pending_idx")
      .on(t.siteId, t.createdAt)
      .where(sql`${t.followUp} and ${t.resolvedAt} is null`),
    unique("resident_notes_id_organization_unique").on(t.id, t.organizationId),
    foreignKey({
      name: "resident_notes_site_organization_fk",
      columns: [t.siteId, t.organizationId],
      foreignColumns: [sites.id, sites.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "resident_notes_resident_organization_fk",
      columns: [t.residentId, t.organizationId],
      foreignColumns: [residents.id, residents.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "resident_notes_category_organization_fk",
      columns: [t.categoryId, t.organizationId],
      foreignColumns: [noteCategories.id, noteCategories.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "resident_notes_shift_organization_fk",
      columns: [t.shiftId, t.organizationId],
      foreignColumns: [shifts.id, shifts.organizationId],
    }).onDelete("restrict"),
    check(
      "resident_notes_content_check",
      sql`length(trim(${t.content})) between 1 and ${sql.raw(String(NOTE_MAX_LENGTH))}`,
    ),
    check("resident_notes_version_check", sql`${t.version} >= 1`),
    check("resident_notes_shift_check", sql`(${t.shiftId} is null) = (${t.shiftDate} is null)`),
    // Solo se resuelve lo que pide seguimiento; quién y cuándo van juntos.
    check(
      "resident_notes_resolution_check",
      sql`(${t.resolvedAt} is null and ${t.resolvedBy} is null and ${t.resolutionNote} is null)
        or (${t.followUp} and ${t.resolvedAt} is not null and ${t.resolvedBy} is not null)`,
    ),
    check(
      "resident_notes_resolution_note_check",
      sql`${t.resolutionNote} is null or length(trim(${t.resolutionNote})) between 1 and ${sql.raw(String(RESOLUTION_MAX_LENGTH))}`,
    ),
    ...tenantPolicies("resident_notes"),
  ],
);

/**
 * Cada versión de una novedad, desde la primera (F.5). Solo se agregan:
 * la app no tiene permiso para modificarlas (migración de permisos).
 */
export const noteVersions = pgTable(
  "note_versions",
  {
    id: primaryId(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    noteId: uuid("note_id").notNull(),
    version: integer("version").notNull(),
    content: text("content").notNull(),
    categoryId: uuid("category_id").notNull(),
    followUp: boolean("follow_up").notNull(),
    editedBy: uuid("edited_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    editedAt: timestamp("edited_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("note_versions_note_version_unique").on(t.noteId, t.version),
    foreignKey({
      name: "note_versions_note_organization_fk",
      columns: [t.noteId, t.organizationId],
      foreignColumns: [residentNotes.id, residentNotes.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "note_versions_category_organization_fk",
      columns: [t.categoryId, t.organizationId],
      foreignColumns: [noteCategories.id, noteCategories.organizationId],
    }).onDelete("restrict"),
    ...tenantPolicies("note_versions"),
  ],
);

export const HANDOVER_NOTE_MAX_LENGTH = 1000;

/**
 * Traspaso de turno (7.3-G, F.4, F.5): una entrega por turno y por sede.
 * La fila existe solo si alguien entregó; si no, el turno siguiente ve el
 * resumen marcado "sin entrega". Si otra persona completa la entrega, es
 * una versión nueva (shift_handover_versions).
 */
export const shiftHandovers = pgTable(
  "shift_handovers",
  {
    id: primaryId(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    siteId: uuid("site_id").notNull(),
    shiftId: uuid("shift_id").notNull(),
    // Fecha local en que empieza el turno (el turno noche, la del día que empieza).
    shiftDate: date("shift_date", { mode: "string" }).notNull(),
    // "Nota para el turno entrante" (opcional).
    note: text("note"),
    version: integer("version").notNull().default(1),
    deliveredBy: uuid("delivered_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }).notNull(),
    confirmedBy: uuid("confirmed_by").references(() => users.id, { onDelete: "restrict" }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("shift_handovers_site_shift_date_unique").on(t.siteId, t.shiftId, t.shiftDate),
    unique("shift_handovers_id_organization_unique").on(t.id, t.organizationId),
    index("shift_handovers_site_date_idx").on(t.siteId, t.shiftDate),
    foreignKey({
      name: "shift_handovers_site_organization_fk",
      columns: [t.siteId, t.organizationId],
      foreignColumns: [sites.id, sites.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "shift_handovers_shift_organization_fk",
      columns: [t.shiftId, t.organizationId],
      foreignColumns: [shifts.id, shifts.organizationId],
    }).onDelete("restrict"),
    check(
      "shift_handovers_note_check",
      sql`${t.note} is null or length(trim(${t.note})) between 1 and ${sql.raw(String(HANDOVER_NOTE_MAX_LENGTH))}`,
    ),
    check("shift_handovers_version_check", sql`${t.version} >= 1`),
    check(
      "shift_handovers_confirmation_check",
      sql`(${t.confirmedAt} is null) = (${t.confirmedBy} is null)`,
    ),
    ...tenantPolicies("shift_handovers"),
  ],
);

/** Cada entrega de un turno, desde la primera. Solo se agregan. */
export const shiftHandoverVersions = pgTable(
  "shift_handover_versions",
  {
    id: primaryId(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    handoverId: uuid("handover_id").notNull(),
    version: integer("version").notNull(),
    note: text("note"),
    deliveredBy: uuid("delivered_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    unique("shift_handover_versions_handover_version_unique").on(t.handoverId, t.version),
    foreignKey({
      name: "shift_handover_versions_handover_organization_fk",
      columns: [t.handoverId, t.organizationId],
      foreignColumns: [shiftHandovers.id, shiftHandovers.organizationId],
    }).onDelete("restrict"),
    ...tenantPolicies("shift_handover_versions"),
  ],
);
