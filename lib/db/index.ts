import "server-only";

import { env } from "@/lib/env";

import { createDb, createPool, type Database } from "./client";

export type { Database, Transaction } from "./client";
export { withSystemTenant, withTenant, withUserContext, type TenantContext } from "./tenant";

// En desarrollo, Next.js recarga módulos: se guarda una sola instancia para
// no abrir un pool nuevo en cada recarga.
const globalForDb = globalThis as unknown as { residencia360Db?: Database };

/** Base de datos con el rol de la app (sin BYPASSRLS). Se crea al primer uso. */
export function getDb(): Database {
  if (!globalForDb.residencia360Db) {
    if (!env.DATABASE_URL) {
      throw new Error("Falta la variable DATABASE_URL (rol de la app).");
    }
    globalForDb.residencia360Db = createDb(createPool(env.DATABASE_URL));
  }
  return globalForDb.residencia360Db;
}
