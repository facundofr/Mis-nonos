import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Sin .env.local: se usan las variables del entorno.
}

// Las migraciones se generan como SQL revisable (db/migrations) y se
// aplican con el rol dueño de las tablas (scripts/migrate.ts), nunca con el
// rol de la app.
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL_OWNER ?? "" },
  strict: true,
  verbose: true,
});
