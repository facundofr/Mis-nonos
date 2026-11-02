import { sql } from "drizzle-orm";
import { index, jsonb, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { appRole, primaryId, publicRole, workerRole } from "./_shared";
import { users } from "./auth";
import { organizations } from "./tenancy";

/**
 * Auditoría genérica de solo agregado (E7, sección 8.14). La app puede
 * insertar y leer (según permisos), nunca modificar ni borrar: no hay
 * políticas ni permisos de UPDATE o DELETE.
 *
 * Particionado mensual: postergado para el piloto (Apéndice F, F.8).
 */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: primaryId(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    siteId: uuid("site_id"),
    // Nulo cuando actúa el sistema (trabajos programados, formulario público).
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "restrict" }),
    // Verbo en pasado con módulo, p. ej. "resident.updated", "emergency.viewed".
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    // Campos que cambiaron: { campo: { antes, despues } } (DC-04).
    changes: jsonb("changes"),
    metadata: jsonb("metadata"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_events_organization_entity_idx").on(
      t.organizationId,
      t.entityType,
      t.entityId,
      t.occurredAt.desc(),
    ),
    index("audit_events_organization_time_idx").on(t.organizationId, t.occurredAt.desc()),
    pgPolicy("audit_events_select", {
      for: "select",
      to: appRole,
      using: sql`organization_id = (select app.current_org_id())`,
    }),
    pgPolicy("audit_events_insert", {
      for: "insert",
      to: appRole,
      withCheck: sql`organization_id = (select app.current_org_id())`,
    }),
    // Formulario público (12.9): solo el alta de su solicitud, sin persona.
    pgPolicy("audit_events_public_insert", {
      for: "insert",
      to: publicRole,
      withCheck: sql`organization_id = (select app.current_org_id())
        and ${t.actorUserId} is null
        and ${t.action} = 'admission_request.created'
        and ${t.entityType} = 'admission_request'`,
    }),
  ],
);

/**
 * Eventos de dominio (E8, patrón outbox). La app los escribe en la misma
 * transacción que el cambio; el worker los pasa a la cola de trabajos y
 * los marca como procesados en una sola transacción (worker/relay.ts).
 */
export const domainEvents = pgTable(
  "domain_events",
  {
    id: primaryId(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    siteId: uuid("site_id"),
    type: text("type").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    // Sin datos sensibles completos (sección 11.1).
    payload: jsonb("payload")
      .notNull()
      .default(sql`'{}'::jsonb`),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [
    index("domain_events_pending_idx")
      .on(t.occurredAt)
      .where(sql`${t.processedAt} is null`),
    index("domain_events_organization_time_idx").on(t.organizationId, t.occurredAt.desc()),
    pgPolicy("domain_events_select", {
      for: "select",
      to: appRole,
      using: sql`organization_id = (select app.current_org_id())`,
    }),
    pgPolicy("domain_events_insert", {
      for: "insert",
      to: appRole,
      withCheck: sql`organization_id = (select app.current_org_id())`,
    }),
    pgPolicy("domain_events_public_insert", {
      for: "insert",
      to: publicRole,
      withCheck: sql`organization_id = (select app.current_org_id())
        and ${t.type} = 'admission_request.created'
        and ${t.entityType} = 'admission_request'
        and ${t.processedAt} is null`,
    }),
    // El worker recorre los eventos de todas las residencias para pasarlos
    // a la cola. Solo puede cambiar processed_at (permiso por columna en la
    // migración 0007) y solo en los que siguen pendientes.
    pgPolicy("domain_events_worker_select", {
      for: "select",
      to: workerRole,
      using: sql`true`,
    }),
    pgPolicy("domain_events_worker_update", {
      for: "update",
      to: workerRole,
      using: sql`${t.processedAt} is null`,
      withCheck: sql`true`,
    }),
  ],
);
