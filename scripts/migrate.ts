/*
 * Aplica las migraciones pendientes con el rol dueño de las tablas
 * (DATABASE_URL_OWNER), nunca con el de la app (sección 10.13).
 *
 * Desarrollo: corepack pnpm db:migrate (lee .env.local).
 * Producción: node dist/tools/migrate.cjs, desde la imagen de la app
 *   (docs/runbooks/despliegue.md).
 */
import { runMigrations } from "@/db/migrator";

async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Sin .env.local: se usan las variables del entorno.
  }

  const ownerUrl = process.env.DATABASE_URL_OWNER;
  if (!ownerUrl) {
    console.error("Falta DATABASE_URL_OWNER: la conexión con el rol dueño de las tablas.");
    process.exitCode = 1;
    return;
  }

  await runMigrations(ownerUrl);
  console.log("Migraciones aplicadas.");
}

main().catch((error: unknown) => {
  // Sin el mensaje completo: los errores de la base pueden traer valores.
  const code = (error as { code?: string; cause?: { code?: string } }).cause?.code;
  console.error(`No se pudieron aplicar las migraciones${code ? ` (código ${code})` : ""}.`);
  console.error(error instanceof Error ? error.message.split("\nparams:")[0] : error);
  process.exitCode = 1;
});
