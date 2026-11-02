import { sql } from "drizzle-orm";
import { foreignKey, index, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { appRole, createdAt, primaryId } from "./_shared";
import { users } from "./auth";
import { residents } from "./residents";
import { organizations, sites } from "./tenancy";

/** Hojas de derivación generadas (11.2, F1-EMG-03): quién y cuándo. */
export const emergencySheetExports = pgTable(
  "emergency_sheet_exports",
  {
    id: primaryId(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    siteId: uuid("site_id").notNull(),
    residentId: uuid("resident_id").notNull(),
    generatedBy: uuid("generated_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("emergency_sheet_exports_resident_idx").on(t.residentId, t.generatedAt),
    foreignKey({
      name: "emergency_sheet_exports_resident_organization_fk",
      columns: [t.residentId, t.organizationId],
      foreignColumns: [residents.id, residents.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "emergency_sheet_exports_site_organization_fk",
      columns: [t.siteId, t.organizationId],
      foreignColumns: [sites.id, sites.organizationId],
    }).onDelete("restrict"),
    pgPolicy("emergency_sheet_exports_select", {
      for: "select",
      to: appRole,
      using: sql`organization_id = (select app.current_org_id())`,
    }),
    pgPolicy("emergency_sheet_exports_insert", {
      for: "insert",
      to: appRole,
      withCheck: sql`organization_id = (select app.current_org_id())`,
    }),
  ],
);

/**
 * Notificaciones dentro de la app (10.6, F1-NOT-01). Las crea el worker a
 * partir de los eventos de dominio; `dedupe_key` evita duplicados si un
 * trabajo se reintenta. Cada persona ve y marca solo las suyas.
 * El texto nunca lleva datos de salud (10.6).
 */
export const notifications = pgTable(
  "notifications",
  {
    id: primaryId(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    recipientUserId: uuid("recipient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    type: text("type").notNull(),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    title: text("title").notNull(),
    body: text("body"),
    // Ruta interna de la app a la que lleva (sin dominio).
    link: text("link"),
    dedupeKey: text("dedupe_key").notNull().unique("notifications_dedupe_key_unique"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("notifications_recipient_idx").on(t.organizationId, t.recipientUserId, t.createdAt),
    index("notifications_unread_idx")
      .on(t.recipientUserId)
      .where(sql`${t.readAt} is null`),
    // Cada persona ve solo las suyas. El worker (withSystemTenant, sin
    // persona) ve las de la residencia: INSERT ... ON CONFLICT exige poder
    // leer la fila para no duplicar.
    pgPolicy("notifications_select", {
      for: "select",
      to: appRole,
      using: sql`organization_id = (select app.current_org_id()) and (recipient_user_id = (select app.current_user_id()) or (select app.current_user_id()) is null)`,
    }),
    // El worker las crea con withSystemTenant (sin persona).
    pgPolicy("notifications_insert", {
      for: "insert",
      to: appRole,
      withCheck: sql`organization_id = (select app.current_org_id())`,
    }),
    pgPolicy("notifications_update", {
      for: "update",
      to: appRole,
      using: sql`organization_id = (select app.current_org_id()) and recipient_user_id = (select app.current_user_id())`,
      withCheck: sql`organization_id = (select app.current_org_id()) and recipient_user_id = (select app.current_user_id())`,
    }),
  ],
);
