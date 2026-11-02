import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

/**
 * Aplica las migraciones pendientes con el rol dueño de las tablas (nunca
 * con el de la app). Espera poco por bloqueos para no frenar a la app
 * (sección 10.12).
 */
export async function runMigrations(
  connectionString: string,
  migrationsFolder = "db/migrations",
): Promise<void> {
  const pool = new Pool({
    connectionString,
    max: 1,
    application_name: "residencia360-migrate",
    options: "-c lock_timeout=10s",
  });
  try {
    await migrate(drizzle({ client: pool }), { migrationsFolder });
  } finally {
    await pool.end();
  }
}
