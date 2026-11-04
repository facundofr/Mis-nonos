import { sql } from "drizzle-orm";
import {
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
import { shifts } from "./catalogs";
import { organizations, sites } from "./tenancy";

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
