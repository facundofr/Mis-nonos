import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { appRole, createdAt, primaryId, updatedAt } from "./_shared";
import { users } from "./auth";
import { shifts } from "./catalogs";
import { organizations, sites } from "./tenancy";

/**
 * Roles como datos (E4). organization_id nulo = rol de sistema
 * (Administrador, Dirección, Enfermería, Cuidador/a).
 */
export const roles = pgTable(
  "roles",
  {
    id: primaryId(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "restrict",
    }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("roles_system_key_unique")
      .on(t.key)
      .where(sql`${t.organizationId} is null`),
    uniqueIndex("roles_organization_key_unique")
      .on(t.organizationId, t.key)
      .where(sql`${t.organizationId} is not null`),
    pgPolicy("roles_select", {
      for: "select",
      to: appRole,
      using: sql`organization_id is null or organization_id = (select app.current_org_id())`,
    }),
  ],
);

/** Catálogo global de permisos, con nombre de módulo (p. ej. residents.read). */
export const permissions = pgTable("permissions", {
  key: text("key").primaryKey(),
  moduleKey: text("module_key").notNull(),
  description: text("description").notNull(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    permissionKey: text("permission_key")
      .notNull()
      .references(() => permissions.key, { onDelete: "restrict" }),
  },
  (t) => [
    primaryKey({ columns: [t.roleId, t.permissionKey] }),
    index("role_permissions_permission_idx").on(t.permissionKey),
    // Visible si su rol es visible (la subconsulta respeta la RLS de roles).
    pgPolicy("role_permissions_select", {
      for: "select",
      to: appRole,
      using: sql`exists (select 1 from roles r where r.id = role_permissions.role_id)`,
    }),
  ],
);

/**
 * Pertenencia de una persona a una organización. En el MVP funciona como
 * perfil básico del empleado (7.3-A); el legajo completo llega en la fase 5.
 */
export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    id: primaryId(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    // Nulo = todas las sedes de la organización.
    siteId: uuid("site_id"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("active"),
    phone: text("phone"),
    profession: text("profession"),
    licenseNumber: text("license_number"),
    // Turno habitual (DC-05): "Enfermería · Turno mañana" y el filtro "En
    // turno ahora" de Empleados. La asignación real de turnos llega en la fase 5.
    usualShiftId: uuid("usual_shift_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("organization_memberships_organization_user_unique").on(t.organizationId, t.userId),
    foreignKey({
      name: "organization_memberships_shift_organization_fk",
      columns: [t.usualShiftId, t.organizationId],
      foreignColumns: [shifts.id, shifts.organizationId],
    }).onDelete("restrict"),
    index("organization_memberships_user_idx").on(t.userId),
    index("organization_memberships_role_idx").on(t.roleId),
    index("organization_memberships_site_idx").on(t.siteId),
    // La sede tiene que ser de la misma organización.
    foreignKey({
      name: "organization_memberships_site_organization_fk",
      columns: [t.siteId, t.organizationId],
      foreignColumns: [sites.id, sites.organizationId],
    }).onDelete("restrict"),
    check(
      "organization_memberships_status_check",
      sql`${t.status} in ('active', 'invited', 'disabled')`,
    ),
    // Cada persona ve sus propias membresías en todas sus residencias (para
    // elegir una al entrar); dentro de una residencia, las de esa residencia.
    pgPolicy("organization_memberships_select", {
      for: "select",
      to: appRole,
      using: sql`organization_id = (select app.current_org_id()) or user_id = (select app.current_user_id())`,
    }),
    pgPolicy("organization_memberships_insert", {
      for: "insert",
      to: appRole,
      withCheck: sql`organization_id = (select app.current_org_id())`,
    }),
    pgPolicy("organization_memberships_update", {
      for: "update",
      to: appRole,
      using: sql`organization_id = (select app.current_org_id())`,
      withCheck: sql`organization_id = (select app.current_org_id())`,
    }),
  ],
);
