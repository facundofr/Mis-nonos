import { sql } from "drizzle-orm";
import { check, foreignKey, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { citext, createdAt, primaryId, tenantPolicies, updatedAt } from "./_shared";
import { roles } from "./access";
import { users } from "./auth";
import { organizations, sites } from "./tenancy";

/**
 * Invitaciones para sumarse a una residencia (F.5). El enlace lleva un
 * token aleatorio y acá se guarda solo su hash SHA-256. Vence a las 72 h.
 *
 * Quien abre el enlace todavía no tiene sesión: la búsqueda por token pasa
 * por la función app.find_invitation (SECURITY DEFINER, migración 0004),
 * que devuelve solo la invitación de ese hash.
 */
export const invitations = pgTable(
  "invitations",
  {
    id: primaryId(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    // Nulo = todas las sedes de la organización.
    siteId: uuid("site_id"),
    email: citext("email").notNull(),
    name: text("name").notNull(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    phone: text("phone"),
    profession: text("profession"),
    licenseNumber: text("license_number"),
    tokenHash: text("token_hash").notNull().unique("invitations_token_hash_unique"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    // Nulo cuando invita el sistema (alta de la residencia, DC-12).
    invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "restrict" }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedUserId: uuid("accepted_user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("invitations_organization_idx").on(t.organizationId, t.createdAt.desc()),
    index("invitations_organization_email_idx").on(t.organizationId, t.email),
    foreignKey({
      name: "invitations_site_organization_fk",
      columns: [t.siteId, t.organizationId],
      foreignColumns: [sites.id, sites.organizationId],
    }).onDelete("restrict"),
    check("invitations_token_hash_check", sql`${t.tokenHash} ~ '^[0-9a-f]{64}$'`),
    check("invitations_final_state_check", sql`${t.acceptedAt} is null or ${t.revokedAt} is null`),
    check(
      "invitations_accepted_user_check",
      sql`(${t.acceptedAt} is null) = (${t.acceptedUserId} is null)`,
    ),
    ...tenantPolicies("invitations"),
  ],
);
