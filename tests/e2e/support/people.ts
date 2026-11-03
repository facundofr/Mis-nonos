import { randomUUID } from "node:crypto";

import { devices, expect, type Browser, type Page } from "@playwright/test";

import { PASSWORD, settleWelcome, skipWelcomeAutomatically } from "./organization";

/** Otra persona en otro teléfono: una sesión aparte, con su propia cookie. */
export async function newPhone(
  browser: Browser,
  options: { skipWelcome?: boolean } = {},
): Promise<Page> {
  const context = await browser.newContext({
    ...devices["Pixel 7"],
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
  });
  const page = await context.newPage();
  if (options.skipWelcome ?? true) await skipWelcomeAutomatically(page);
  return page;
}

export const suffix = () => randomUUID().slice(0, 8);

/**
 * Administración crea a alguien sin email (DC-11). Devuelve el usuario y la
 * contraseña provisoria sugerida por la pantalla.
 */
export async function createUserWithoutEmail(
  admin: Page,
  input: { name: string; roleName: string },
): Promise<{ username: string; temporaryPassword: string }> {
  const firstName = input.name
    .split(" ")[0]!
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  const username = `${firstName.toLowerCase()}.${suffix()}`;
  await admin.goto("/usuarios/nuevo");
  await admin.getByLabel("Nombre y apellido").fill(input.name);
  await admin.getByLabel(/^Usuario/).fill(username);
  const temporaryPassword = await admin.getByLabel("Contraseña provisoria").inputValue();
  await admin.getByRole("radio", { name: new RegExp(`^${input.roleName}`) }).check();
  await admin.getByRole("button", { name: "Crear usuario" }).click();
  await expect(admin).toHaveURL(/\/usuarios\/[0-9a-f-]+\?creado=1/);
  return { username, temporaryPassword };
}

/** Primer ingreso con contraseña provisoria: elige una propia y llega al inicio. */
export async function firstLoginWithTemporaryPassword(
  page: Page,
  credentials: { username: string; temporaryPassword: string },
): Promise<void> {
  await page.goto("/ingresar");
  await page.getByLabel("Email o usuario").fill(credentials.username);
  await page.getByLabel("Contraseña", { exact: true }).fill(credentials.temporaryPassword);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/cambiar-contrasena/);
  await page.getByLabel("Contraseña que te dieron").fill(credentials.temporaryPassword);
  await page.getByLabel(/^Contraseña nueva/).fill(PASSWORD);
  await page.getByLabel("Repetí la contraseña nueva").fill(PASSWORD);
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();
  // Administración y Dirección siguen con el 2FA; el resto llega al inicio.
  await expect(page).toHaveURL(/\/(inicio|activar-2fa)/);
  // Administración y Dirección pasan un momento por /inicio antes de ir al
  // 2FA: se espera a ver dónde quedó de verdad.
  const twoFactor = page.getByRole("heading", { name: /^Activá la verificación/ });
  const home = page.getByRole("heading", { name: /^Buen(os|as) / });
  await expect(twoFactor.or(home).or(page.getByRole("dialog")).first()).toBeVisible();
  if (await twoFactor.isVisible()) return;
  await settleWelcome(page);
}

/** Emails que recibió una dirección en Mailpit (desarrollo). */
export async function mailpitMessagesTo(address: string): Promise<{ Subject: string }[]> {
  const url = new URL("http://localhost:8025/api/v1/search");
  url.searchParams.set("query", `to:"${address}"`);
  const response = await fetch(url);
  if (!response.ok) return [];
  const body = (await response.json()) as { messages?: { Subject: string }[] };
  return body.messages ?? [];
}

/** Texto del último email que recibió una dirección en Mailpit. */
export async function mailpitLatestText(address: string): Promise<string> {
  const url = new URL("http://localhost:8025/api/v1/search");
  url.searchParams.set("query", `to:"${address}"`);
  const response = await fetch(url);
  if (!response.ok) return "";
  const body = (await response.json()) as { messages?: { ID: string }[] };
  const id = body.messages?.[0]?.ID;
  if (!id) return "";
  const message = await fetch(`http://localhost:8025/api/v1/message/${id}`);
  return message.ok ? ((await message.json()) as { Text: string }).Text : "";
}
