import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { createdAt, primaryId, updatedAt } from "./_shared";
import { users } from "./auth";
import { organizations } from "./tenancy";

/**
 * Sesiones en la base (Better Auth). Sin RLS, como el resto de la identidad
 * (docs/decisions/0003): se buscan por token antes de conocer la residencia.
 * La app puede borrarlas: cerrar la sesión la elimina.
 *
 * Está en un archivo aparte porque apunta a organizations y tenancy.ts ya
 * importa auth.ts.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique("sessions_token_unique"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    // Residencia elegida al entrar: fija el contexto de RLS de cada pedido.
    activeOrganizationId: uuid("active_organization_id").references(() => organizations.id, {
      onDelete: "restrict",
    }),
    // Tope de 12 h cuando no se tildó "Mantener sesión" (DC-10).
    absoluteExpiresAt: timestamp("absolute_expires_at", { withTimezone: true }),
    // Última actividad: Administración y Dirección cierran a las 8 h (DC-10).
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);
