import { sql } from "drizzle-orm";
import { check, pgPolicy, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { appRole, createdAt, primaryId } from "./_shared";
import { users } from "./auth";
import { organizations } from "./tenancy";

/*
 * Guía de uso (onboarding): qué partes ya vio cada persona en cada
 * residencia. Se guarda en la base y no en el navegador porque los
 * teléfonos y tablets del turno se comparten. "Volver a ver la guía" pone
 * seen_at en nulo; no se borra nada.
 */
export const userOnboarding = pgTable(
  "user_onboarding",
  {
    id: primaryId(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    // "welcome", "tip:novedades", "setup:catalogos", "setup:hidden"…
    key: text("key").notNull(),
    seenAt: timestamp("seen_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    unique("user_onboarding_user_key_unique").on(t.organizationId, t.userId, t.key),
    check("user_onboarding_key_check", sql`${t.key} ~ '^[a-z][a-z0-9_:-]{1,59}$'`),
    // Cada persona ve y marca solo lo suyo.
    pgPolicy("user_onboarding_select", {
      for: "select",
      to: appRole,
      using: sql`organization_id = (select app.current_org_id()) and user_id = (select app.current_user_id())`,
    }),
    pgPolicy("user_onboarding_insert", {
      for: "insert",
      to: appRole,
      withCheck: sql`organization_id = (select app.current_org_id()) and user_id = (select app.current_user_id())`,
    }),
    pgPolicy("user_onboarding_update", {
      for: "update",
      to: appRole,
      using: sql`organization_id = (select app.current_org_id()) and user_id = (select app.current_user_id())`,
      withCheck: sql`organization_id = (select app.current_org_id()) and user_id = (select app.current_user_id())`,
    }),
  ],
);
