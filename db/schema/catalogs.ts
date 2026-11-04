import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  time,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { createdAt, primaryId, tenantPolicies, updatedAt } from "./_shared";
import { organizations, sites } from "./tenancy";

/*
 * Catálogos configurables de cada residencia (E9): se cambian desde
 * Configuración, sin tocar el código. Valores iniciales: lib/catalogs/defaults.ts.
 * Nada se borra: lo que ya no se usa se desactiva (los registros viejos
 * siguen apuntando a él).
 */

/** Turnos de la sede (7.3-B). El turno noche cruza la medianoche. */
export const shifts = pgTable(
  "shifts",
  {
    id: primaryId(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    siteId: uuid("site_id").notNull(),
    name: text("name").notNull(),
    // Hora local de la sede (sites.timezone).
    startsAt: time("starts_at").notNull(),
    endsAt: time("ends_at").notNull(),
    position: integer("position").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("shifts_site_idx").on(t.siteId, t.position),
    unique("shifts_site_name_unique").on(t.siteId, t.name),
    // Para claves foráneas compuestas que no mezclan residencias (11.4).
    unique("shifts_id_organization_unique").on(t.id, t.organizationId),
    foreignKey({
      name: "shifts_site_organization_fk",
      columns: [t.siteId, t.organizationId],
      foreignColumns: [sites.id, sites.organizationId],
    }).onDelete("restrict"),
    check("shifts_hours_check", sql`${t.startsAt} <> ${t.endsAt}`),
    check("shifts_name_check", sql`length(trim(${t.name})) between 1 and 40`),
    ...tenantPolicies("shifts"),
  ],
);

/**
 * Documentos del legajo por modalidad (7.3-C2, 11.2). `key` es estable: el
 * nombre visible se puede cambiar sin perder los documentos cargados.
 */
export const documentTypes = pgTable(
  "document_types",
  {
    id: primaryId(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    // all = todas las modalidades; pami o private = solo esa.
    requiredFor: text("required_for").notNull().default("all"),
    required: boolean("required").notNull().default(true),
    position: integer("position").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("document_types_organization_key_unique").on(t.organizationId, t.key),
    unique("document_types_id_organization_unique").on(t.id, t.organizationId),
    check("document_types_required_for_check", sql`${t.requiredFor} in ('all', 'pami', 'private')`),
    check("document_types_key_check", sql`${t.key} ~ '^[a-z][a-z0-9_]{1,39}$'`),
    check("document_types_name_check", sql`length(trim(${t.name})) between 1 and 80`),
    ...tenantPolicies("document_types"),
  ],
);
