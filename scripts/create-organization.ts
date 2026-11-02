/*
 * Alta de una residencia y de su primer administrador (DC-12). Corre con el
 * rol dueño (DATABASE_URL_OWNER), que no está sujeto a RLS.
 *
 * Uso:
 *   corepack pnpm org:create --residencia "Residencia de prueba" --sede "Sede central" \
 *     --email administracion@ejemplo.com --nombre "Nombre Apellido"
 *
 * Crea la organización, su primera sede, los módulos del MVP y una
 * invitación con el rol Administración. Muestra el enlace, que vence a las
 * 72 horas: la persona crea su contraseña y, al ingresar, activa el 2FA.
 */
import { parseArgs } from "node:util";

import { z } from "zod";

import { createDb, createPool } from "@/lib/db/client";
import { createOrganization } from "@/lib/organizations/create";

const USAGE =
  'Uso: corepack pnpm org:create --residencia "Nombre" --sede "Sede central" --email persona@ejemplo.com --nombre "Nombre Apellido"';

const inputSchema = z.object({
  residencia: z.string().trim().min(2).max(120),
  sede: z.string().trim().min(2).max(120),
  email: z.email(),
  nombre: z.string().trim().min(2).max(120),
});

async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // En producción las variables vienen del entorno.
  }

  const { values } = parseArgs({
    options: {
      residencia: { type: "string" },
      sede: { type: "string" },
      email: { type: "string" },
      nombre: { type: "string" },
    },
  });
  const parsed = inputSchema.safeParse(values);
  if (!parsed.success) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }
  const input = parsed.data;

  const ownerUrl = process.env.DATABASE_URL_OWNER;
  if (!ownerUrl) {
    console.error("Falta la variable DATABASE_URL_OWNER (rol dueño de la base).");
    process.exitCode = 1;
    return;
  }
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  const pool = createPool(ownerUrl, { max: 1, application_name: "residencia360-alta" });
  const db = createDb(pool);
  try {
    const result = await db.transaction((tx) =>
      createOrganization(tx, {
        organizationName: input.residencia,
        siteName: input.sede,
        adminEmail: input.email,
        adminName: input.nombre,
      }),
    );

    const link = new URL(`/invitacion/${result.invitationToken}`, appUrl).href;
    console.log(
      [
        "",
        `Residencia creada: ${input.residencia} (${result.organizationId})`,
        "",
        `Enviá este enlace a ${input.nombre}. Con él crea su contraseña; vence a las 72 horas:`,
        link,
        "",
      ].join("\n"),
    );
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
