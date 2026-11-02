import { randomUUID } from "node:crypto";

import { expect, type Page } from "@playwright/test";

import { createDb, createPool } from "@/lib/db/client";
import { createOrganization } from "@/lib/organizations/create";
import { totp } from "@/tests/support/totp";

/*
 * Datos de prueba de punta a punta: cada prueba crea su propia residencia
 * (ficticia) con el rol dueño, como el script de alta. Así las pruebas no
 * dependen unas de otras ni de lo que haya en la base de desarrollo.
 */

try {
  process.loadEnvFile(".env.local");
} catch {
  // En CI las variables vienen del entorno.
}

export const PASSWORD = "una frase de prueba bastante larga";

export interface TestOrganization {
  organizationId: string;
  siteId: string;
  adminEmail: string;
  adminName: string;
  invitationToken: string;
}

export async function createTestOrganization(
  name = "Residencia de prueba",
): Promise<TestOrganization> {
  const ownerUrl = process.env.DATABASE_URL_OWNER;
  if (!ownerUrl) throw new Error("Falta DATABASE_URL_OWNER para crear los datos de prueba.");
  const pool = createPool(ownerUrl, { max: 1, application_name: "pruebas-e2e" });
  try {
    const db = createDb(pool);
    const suffix = randomUUID().slice(0, 8);
    const adminEmail = `admin-${suffix}@prueba.test`;
    const adminName = "Laura Pereyra";
    const created = await db.transaction((tx) =>
      createOrganization(tx, {
        organizationName: `${name} ${suffix}`,
        siteName: "Sede central",
        adminEmail,
        adminName,
      }),
    );
    return { ...created, adminEmail, adminName };
  } finally {
    await pool.end();
  }
}

/** Lee la clave del 2FA que muestra la pantalla de activación. */
async function readTwoFactorSecret(page: Page): Promise<string> {
  await page.getByText("No puedo escanear: escribir la clave a mano").click();
  const text = await page.locator("details p").first().textContent();
  return (text ?? "").replace(/\s+/g, "");
}

/**
 * La guía de la primera vez (onboarding) se saltea en las pruebas que no
 * tratan de ella, apenas aparece (settleWelcome), para que no quede una
 * actualización de pantalla en vuelo mientras la prueba sigue.
 */
const autoSkip = new WeakSet<Page>();

export async function skipWelcomeAutomatically(page: Page): Promise<void> {
  autoSkip.add(page);
}

const welcomeDialog = (page: Page) => page.getByRole("dialog", { name: /^Te damos la bienvenida/ });

/**
 * Al llegar al inicio por primera vez: si la página saltea la guía, espera
 * la bienvenida, la saltea y espera a que se guarde (el diálogo se cierra
 * cuando la acción terminó). Así no queda una actualización en vuelo
 * mientras la prueba sigue.
 */
export async function settleWelcome(page: Page): Promise<void> {
  if (!autoSkip.has(page)) return;
  const dialog = welcomeDialog(page);
  await dialog.getByRole("button", { name: "Saltar la guía" }).click();
  await expect(dialog).toHaveCount(0, { timeout: 15_000 });
}

/**
 * Alta completa de la primera administradora: acepta la invitación, crea su
 * contraseña y activa el 2FA. Termina en el inicio, con la sesión abierta.
 */
export async function onboardAdmin(
  page: Page,
  organization: TestOrganization,
  options: { skipWelcome?: boolean } = {},
) {
  if (options.skipWelcome ?? true) await skipWelcomeAutomatically(page);
  await page.goto(`/invitacion/${organization.invitationToken}`);
  await page.getByLabel("Contraseña nueva").fill(PASSWORD);
  await page.getByLabel("Repetí la contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Crear contraseña e ingresar" }).click();

  // Administración y Dirección activan el 2FA antes de usar la app.
  return activateTwoFactor(page);
}

/** Activa el 2FA (Administración y Dirección) y termina en el inicio. */
export async function activateTwoFactor(page: Page, password = PASSWORD) {
  await expect(page).toHaveURL(/\/activar-2fa/);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Continuar" }).click();
  const secret = await readTwoFactorSecret(page);
  await page.getByLabel("Código de 6 dígitos").fill(totp(secret));
  await page.getByRole("button", { name: "Activar" }).click();
  await expect(page).toHaveURL(/\/inicio/);
  await settleWelcome(page);
  return { secret };
}

/**
 * Corre los turnos de la sede para que el turno en curso termine en 30
 * minutos (así se puede entregar y confirmar el traspaso a cualquier hora
 * en que corran las pruebas). Los tres turnos siguen cubriendo el día.
 */
export async function alignShiftsToNow(siteId: string): Promise<void> {
  const ownerUrl = process.env.DATABASE_URL_OWNER;
  if (!ownerUrl) throw new Error("Falta DATABASE_URL_OWNER para preparar los turnos.");
  const pool = createPool(ownerUrl, { max: 1, application_name: "pruebas-e2e" });
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Argentina/Buenos_Aires",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const minutesNow =
      Number(parts.find((part) => part.type === "hour")!.value) * 60 +
      Number(parts.find((part) => part.type === "minute")!.value);
    const time = (offset: number) => {
      const value = (((minutesNow + offset) % 1440) + 1440) % 1440;
      return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
    };
    // En curso: de 7 h 30 antes a 30 min después; los otros dos, 8 h cada uno.
    const bounds = [time(-450), time(30), time(510), time(-450)];
    const result = await pool.query<{ id: string }>(
      "select id from shifts where site_id = $1 order by position",
      [siteId],
    );
    for (const [index, row] of result.rows.entries()) {
      await pool.query("update shifts set starts_at = $2, ends_at = $3 where id = $1", [
        row.id,
        bounds[index],
        bounds[index + 1],
      ]);
    }
  } finally {
    await pool.end();
  }
}
