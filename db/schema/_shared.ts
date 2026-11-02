import { sql } from "drizzle-orm";
import { customType, pgPolicy, pgRole, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Rol con el que se conecta la app: sin BYPASSRLS y sin ser dueño de las
 * tablas (sección 10.13). Lo crea db/init/01-roles.sh (o el manual de
 * producción); Drizzle no lo administra.
 */
export const appRole = pgRole("r360_app").existing();

/**
 * Rol del worker (pg-boss). En las tablas de la app solo lee y marca los
 * eventos de dominio pendientes; el trabajo de cada residencia lo hace con
 * el rol de la app y withTenant (docs/decisions/0005).
 */
export const workerRole = pgRole("r360_worker").existing();

/**
 * Rol del formulario público (12.9). Sin login: la app lo asume con
 * `SET LOCAL ROLE` solo en esa transacción (features/public-intake). Puede
 * agregar una solicitud de la landing, su evento y su auditoría, y nada
 * más: no lee ninguna tabla, ni la solicitud que acaba de crear.
 */
export const publicRole = pgRole("r360_public").existing();

/** Clave primaria UUIDv7, generada por PostgreSQL 18 (sección 10.12). */
export const primaryId = () =>
  uuid("id")
    .primaryKey()
    .default(sql`uuidv7()`);

export const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/** Texto que no distingue mayúsculas (emails). Requiere la extensión citext. */
export const citext = customType<{ data: string }>({
  dataType: () => "citext",
});

/**
 * Aislamiento por organización para tablas operativas: la app solo lee y
 * escribe filas de la organización de la transacción, que fija withTenant
 * en el servidor (lib/db/tenant.ts). Sin política de DELETE: no hay
 * borrados físicos (sección 10.9, E6).
 */
export function tenantPolicies(table: string) {
  return [
    pgPolicy(`${table}_select`, {
      for: "select",
      to: appRole,
      using: sql`organization_id = (select app.current_org_id())`,
    }),
    pgPolicy(`${table}_insert`, {
      for: "insert",
      to: appRole,
      withCheck: sql`organization_id = (select app.current_org_id())`,
    }),
    pgPolicy(`${table}_update`, {
      for: "update",
      to: appRole,
      using: sql`organization_id = (select app.current_org_id())`,
      withCheck: sql`organization_id = (select app.current_org_id())`,
    }),
  ];
}
