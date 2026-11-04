import { expect, test } from "@playwright/test";

import { createTestOrganization, onboardAdmin } from "./support/organization";
import { newPhone, suffix } from "./support/people";

// F1-SOL-03 y F1-SOL-04: formulario público (7.3-C3, 12.9). Es una vía
// opcional más: la solicitud llega a la misma bandeja. La landing está oculta
// (docs/decisions/0022): la app arranca en /ingresar. Datos ficticios.

test("la raíz y la landing llevan al ingreso", async ({ browser }) => {
  const visitor = await newPhone(browser);
  await visitor.goto("/");
  await expect(visitor).toHaveURL(/\/ingresar$/);
  await visitor.goto("/residencia/cualquiera");
  await expect(visitor).toHaveURL(/\/ingresar$/);
});

test("Administración publica el formulario; una familia pide un lugar y llega a la bandeja", async ({
  page,
  browser,
}) => {
  const organization = await createTestOrganization();
  await onboardAdmin(page, organization);
  const slug = `residencia-${suffix()}`;

  // Sin publicar, la dirección no existe.
  const family = await newPhone(browser, { skipWelcome: false });
  const notFound = await family.goto(`/residencia/${slug}/solicitar`);
  expect(notFound?.status()).toBe(404);

  await page.goto("/configuracion");
  await page.getByRole("link", { name: /Formulario público/ }).click();
  await expect(page.getByText(/aviso de privacidad es un borrador/)).toBeVisible();
  await page.getByRole("textbox", { name: "Dirección" }).fill(slug);
  await page
    .getByLabel("Presentación")
    .fill("Casa de familia en Haedo, con enfermería las 24 horas.");
  await page.getByText("Publicar el formulario").click();
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Formulario publicado.")).toBeVisible();

  // La familia entra con el enlace del formulario: la landing ya no se muestra.
  await family.goto(`/residencia/${slug}/solicitar`);
  await expect(family.getByText("Paso 1 de 2")).toBeVisible();

  // Sin los obligatorios, no pasa al paso 2.
  await family.getByRole("button", { name: "Siguiente" }).click();
  await expect(family.getByText("Paso 1 de 2")).toBeVisible();

  await family.getByRole("textbox", { name: "Nombre *", exact: true }).fill("Rosa");
  await family.getByRole("textbox", { name: "Apellido *" }).fill("Medina");
  await family.getByLabel(/^Fecha de nacimiento/).fill("1940-05-02");
  await family.getByLabel(/^Modalidad/).selectOption("Privado");
  await family.getByRole("button", { name: "Siguiente" }).click();
  await expect(family.getByText("Paso 2 de 2")).toBeVisible();
  await expect(family.getByRole("heading", { name: "¿Cómo te contactamos?" })).toBeVisible();

  await family.getByRole("textbox", { name: "Nombre y apellido *" }).fill("Carla Medina");
  await family.getByRole("textbox", { name: "Teléfono *" }).fill("11 5555 1234");
  await family.getByLabel("¿Querés contarnos algo?").fill("Busca vacante para fin de mes.");

  // Un envío en menos de 3 s se toma como de un robot (guard.ts): una
  // persona tarda más que Playwright.
  await family.waitForTimeout(3_000);
  // Sin aceptar el aviso de privacidad, no se envía.
  await family.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(family.getByText(/aceptá el aviso de privacidad/)).toBeVisible();
  await family.getByText(/Leí el aviso de privacidad/).click();
  await family.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(family.getByRole("heading", { name: /Recibimos tu solicitud/ })).toBeVisible();
  await expect(family).toHaveURL(new RegExp(`/residencia/${slug}/enviada$`));

  // El aviso de privacidad se puede leer, con su versión.
  await family.goto(`/residencia/${slug}/privacidad`);
  await expect(family.getByRole("heading", { name: "Aviso de privacidad" })).toBeVisible();
  await expect(family.getByText(/Versión/)).toBeVisible();
  // La familia no entra a la app.
  await family.goto("/solicitudes");
  await expect(family).toHaveURL(/\/ingresar/);

  // Llega a la bandeja como "Formulario web", junto con las cargadas a mano.
  await page.goto("/solicitudes");
  const item = page.getByRole("link", { name: /Rosa Medina/ });
  await expect(item).toBeVisible();
  await expect(item.getByText(/Formulario web/)).toBeVisible();
  await item.click();
  await expect(page.getByText("Busca vacante para fin de mes.")).toBeVisible();
  await expect(page.getByText("Llegó la solicitud por el formulario web")).toBeVisible();
  await expect(page.getByText("Familia (formulario web)")).toBeVisible();

  // Apagado, la dirección vuelve a no existir.
  await page.goto("/configuracion/formulario-publico");
  await page.getByText("Publicar el formulario").click();
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText(/no está publicado/)).toBeVisible();
  const off = await family.goto(`/residencia/${slug}/solicitar`);
  expect(off?.status()).toBe(404);
});
