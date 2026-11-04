import { expect, test } from "@playwright/test";

import { createTestOrganization, onboardAdmin } from "./support/organization";
import {
  createUserWithoutEmail,
  firstLoginWithTemporaryPassword,
  newPhone,
} from "./support/people";

// Etapa 3.7: bandeja de solicitudes, carga manual (F1-SOL-01) y conversión
// en ingreso guiado (F1-SOL-02). Datos ficticios.

test("una familia llama: se carga la solicitud, se convierte en ingreso y otra se descarta", async ({
  page,
  browser,
}) => {
  const organization = await createTestOrganization();
  await onboardAdmin(page, organization);

  await page.goto("/pacientes");
  await page.getByRole("link", { name: "Solicitudes · 0" }).click();
  await page.getByRole("link", { name: "Nueva solicitud" }).click();

  // Lo mínimo, primero: faltan datos.
  await page.getByRole("button", { name: "Guardar solicitud" }).click();
  await expect(page.getByText("Elegí por dónde llegó.")).toBeVisible();
  await page.getByLabel(/^Canal/).selectOption("Teléfono");
  await page.getByLabel(/^Nombre \*/).fill("Rosa");
  await page.getByLabel(/^Apellido/).fill("Medina");
  await page.getByLabel("DNI", { exact: true }).fill("3.811.222");
  await page.getByLabel("Modalidad").selectOption("PAMI (internación geriátrica)");
  await page.getByLabel("Cobertura", { exact: true }).selectOption("PAMI");
  await page.getByLabel("N.º de beneficiario o afiliado").fill("15-1234567-0-00");
  await page.getByLabel(/^Nombre y apellido/).fill("Carla Medina");
  await page.getByLabel("Vínculo").first().selectOption("Hijo/a");
  await page.getByLabel(/^Teléfono \*/).fill("11 5555 1234");
  await page.getByLabel("DNI del responsable").fill("20111333");
  await page.getByLabel("Domicilio del responsable").fill("Calle Falsa 123");
  await page.getByLabel("Familiar 1: nombre").fill("Pedro Medina");
  await page.getByLabel("Teléfono", { exact: true }).first().fill("11 4444 0000");
  await page.getByLabel("Lo que contó la familia").fill("Busca vacante para fin de mes.");
  await page.getByRole("button", { name: "Guardar solicitud" }).click();
  await expect(page.getByText("Solicitud guardada en la bandeja.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rosa Medina" })).toBeVisible();

  await page.getByRole("button", { name: "Marcar «En contacto»" }).click();
  await expect(page.getByText("En contacto", { exact: true }).first()).toBeVisible();

  // Convertir: arma el ingreso guiado con los datos y los contactos.
  await page.getByRole("button", { name: "Convertir en ingreso" }).click();
  await expect(page).toHaveURL(/\/ingresos\/[0-9a-f-]+\/responsable\?desde=solicitud/);
  await expect(page.getByText(/Ingreso armado con los datos de la solicitud/)).toBeVisible();
  await expect(page.getByText("Carla Medina").first()).toBeVisible();
  await expect(page.getByText("Pedro Medina").first()).toBeVisible();
  await page.goto("/ingresos");
  await expect(page.getByText("Rosa Medina")).toBeVisible();

  // Otra solicitud, sin vacante: se descarta con motivo.
  await page.goto("/solicitudes/nueva");
  await page.getByLabel(/^Canal/).selectOption("WhatsApp");
  await page.getByLabel(/^Nombre \*/).fill("Juan");
  await page.getByLabel(/^Apellido/).fill("Pérez");
  await page.getByLabel(/^Nombre y apellido/).fill("Marta Pérez");
  await page.getByLabel(/^Teléfono \*/).fill("11 3333 2222");
  await page.getByRole("button", { name: "Guardar solicitud" }).click();
  await expect(page.getByText("Solicitud guardada en la bandeja.")).toBeVisible();
  await page.getByRole("button", { name: "Descartar la solicitud" }).click();
  await expect(page.getByText("Elegí el motivo.")).toBeVisible();
  await page.getByLabel(/^Motivo/).selectOption("La familia desistió");
  await page.getByRole("button", { name: "Descartar la solicitud" }).click();
  await expect(page.getByText(/Descartada: La familia desistió/)).toBeVisible();

  await page.goto("/solicitudes?ver=convertidas");
  await expect(page.getByRole("link", { name: /Rosa Medina/ })).toBeVisible();

  // Asistente no ve la bandeja.
  const credentials = await createUserWithoutEmail(page, {
    name: "Marta Gómez",
    roleName: "Asistente",
  });
  const marta = await newPhone(browser);
  await firstLoginWithTemporaryPassword(marta, credentials);
  await marta.goto("/pacientes");
  await expect(marta.getByRole("link", { name: /^Solicitudes/ })).toHaveCount(0);
  await marta.goto("/solicitudes");
  await expect(marta).toHaveURL(/\/sin-permiso/);
});

test("después de un error, las listas conservan la opción elegida", async ({ page }) => {
  const organization = await createTestOrganization();
  await onboardAdmin(page, organization);
  await page.goto("/solicitudes/nueva");
  await page.getByLabel(/^Canal/).selectOption("Teléfono");
  await page.getByLabel("Modalidad").selectOption("Privado");
  await page.getByRole("button", { name: "Guardar solicitud" }).click();
  await expect(page.getByText("Escribí el nombre.").first()).toBeVisible();
  await expect(page.getByLabel(/^Canal/)).toHaveValue("phone");
  await expect(page.getByLabel("Modalidad")).toHaveValue("private");
});
