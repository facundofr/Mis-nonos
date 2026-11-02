import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

import * as schema from "@/db/schema";

export type Database = NodePgDatabase<typeof schema>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Pool de conexiones con los límites de la sección 10.12: 5 s por consulta
 * en la app, corte de las transacciones que quedan abiertas sin actividad
 * y 5 s como máximo para conseguir una conexión (si la base no responde,
 * el pedido falla rápido en lugar de quedar colgado).
 */
export function createPool(connectionString: string, overrides: PoolConfig = {}): Pool {
  const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 5_000,
    idle_in_transaction_session_timeout: 10_000,
    application_name: "residencia360-app",
    ...overrides,
  });
  // Si la base corta una conexión inactiva (reinicio, red), node-postgres
  // emite "error": sin este manejador, el proceso entero se cae. La conexión
  // se descarta y el pool abre otra en el próximo pedido.
  pool.on("error", (error) => {
    console.error("Se perdió una conexión inactiva con la base de datos.", error);
  });
  return pool;
}

export function createDb(pool: Pool): Database {
  return drizzle({ client: pool, schema });
}
