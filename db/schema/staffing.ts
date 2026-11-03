import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { appRole, createdAt, primaryId } from "./_shared";
import { users } from "./auth";
import { organizations, sites } from "./tenancy";

/*
 * Asistencia del personal (fase 5 adelantada, docs/decisions/0020): cada
 * persona registra su entrada y su salida escaneando el QR de la sede. La
 * hora es la del servidor. Solo se agregan registros: no se corrigen ni se
 * borran.
 */

const inOrg = sql`organization_id = (select app.current_org_id())`;
const currentUser = sql`(select app.current_user_id())`;
const userCan = (permission: string) =>
  sql`(select app.current_user_can(${sql.raw(`'${permission}'`)}))`;

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: primaryId(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    siteId: uuid("site_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    // "in" (entrada) o "out" (salida).
    kind: text("kind").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    index("attendance_records_site_user_idx").on(t.siteId, t.userId, t.occurredAt),
    index("attendance_records_site_occurred_idx").on(t.siteId, t.occurredAt),
    foreignKey({
      name: "attendance_records_site_organization_fk",
      columns: [t.siteId, t.organizationId],
      foreignColumns: [sites.id, sites.organizationId],
    }).onDelete("restrict"),
    check("attendance_records_kind_check", sql`${t.kind} in ('in', 'out')`),
    // Cada uno ve lo suyo; Administración y Dirección, el de todos.
    pgPolicy("attendance_records_select", {
      for: "select",
      to: appRole,
      using: sql`${inOrg} and (${currentUser} is null or user_id = ${currentUser} or ${userCan("attendance.read")})`,
    }),
    // Nadie registra la asistencia de otra persona.
    pgPolicy("attendance_records_insert", {
      for: "insert",
      to: appRole,
      withCheck: sql`${inOrg} and user_id = ${currentUser} and ${userCan("attendance.record")}`,
    }),
  ],
);
