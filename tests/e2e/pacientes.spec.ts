import { expect, test } from "@playwright/test";

import { createTestOrganization, onboardAdmin } from "./support/organization";
import {
  createUserWithoutEmail,
  firstLoginWithTemporaryPassword,
  newPhone,
} from "./support/people";
import { admitResident } from "./support/residents";

// Etapa 3.2: ingreso guiado (F1-ING-01, F1-ING-02), ficha del paciente
// (F1-RES-01 a F1-RES-05) y permisos por rol (F.3). Datos ficticios.

test("ingreso guiado completo: el paciente aparece en la lista y se busca sin acentos", async ({
  page,
}) => {
  const organization = await createTestOrganization();
  await onboardAdmin(page, organization);
  const ficha = await admitResident(page, {
    firstName: "Elena",
    lastName: "Ramírez",
    nationalId: "4.512.778",
    room: "12",
  });

  await expect(page.getByRole("heading", { name: "Elena Ramírez" })).toBeVisible();
  await expect(page.getByText("Dieta de textura blanda.")).toBeVisible();
  await page.getByRole("link", { name: "Contactos" }).click();
  await expect(page.getByRole("link", { name: "Llamar a Silvia Ramírez" })).toHaveAttribute(
    "href",
    "tel:1158214430",
  );

  for (const query of ["ramirez", "ELENA", "12", "4512778"]) {
    await page.goto(`/pacientes?q=${encodeURIComponent(query)}`);
    await expect(page.getByRole("link", { name: /^(?!Emergencia).*Elena Ramírez/ })).toBeVisible();
  }
  await page.goto("/pacientes?q=nadie");
  await expect(page.getByText("Sin resultados")).toBeVisible();
  expect(ficha).toMatch(/\/pacientes\/[0-9a-f-]+$/);
});

test("no se puede ingresar dos veces el mismo DNI", async ({ page }) => {
  const organization = await createTestOrganization();
  await onboardAdmin(page, organization);
  await admitResident(page, {
    firstName: "Rosa",
    lastName: "Medina",
    nationalId: "30111222",
    room: "3",
  });

  await page.goto("/ingresos/nuevo");
  await page.getByLabel(/^Nombre/).fill("Rosa");
  await page.getByLabel(/^Apellido/).fill("Medina");
  await page.getByLabel("DNI", { exact: true }).fill("30.111.222");
  await page.getByLabel("N.º de beneficiario PAMI").fill("15-1");
  await page.getByRole("button", { name: "Siguiente: responsable" }).click();
  await expect(page.getByText("Ya hay un paciente con ese DNI: Rosa Medina.")).toBeVisible();
});

test("ficha: alergias, edición, internado fuera, vuelta, egreso y actividad", async ({ page }) => {
  const organization = await createTestOrganization();
  await onboardAdmin(page, organization);
  const ficha = await admitResident(page, {
    firstName: "Héctor",
    lastName: "Benítez",
    nationalId: "5111222",
    room: "7",
  });

  await page.getByLabel("Alergia a").fill("Penicilina");
  await page.getByLabel("Reacción").fill("Ronchas");
  await page.getByRole("button", { name: "Agregar alergia" }).click();
  await expect(page.getByText(/Alergia a penicilina/)).toBeVisible();
  await page.goto("/pacientes");
  await expect(page.getByRole("link", { name: /^(?!Emergencia).*Héctor Benítez/ })).toContainText(
    "Alergia",
  );
  await page.goto(ficha);

  await page.getByRole("link", { name: "Editar datos" }).click();
  await page.getByLabel("Habitación").fill("14");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Los datos quedaron guardados.")).toBeVisible();
  await expect(page.getByText("Hab. 14")).toBeVisible();

  await page.getByRole("link", { name: "Internación o egreso" }).click();
  await page.getByLabel(/^¿Dónde está internado/).fill("Sanatorio de prueba");
  await page.getByRole("button", { name: "Marcar internado fuera" }).click();
  await expect(page.getByText(/Internado\/a en Sanatorio de prueba/)).toBeVisible();

  await page.goto("/pacientes?ver=internados");
  await expect(page.getByRole("link", { name: /^(?!Emergencia).*Héctor Benítez/ })).toContainText(
    "Internado fuera",
  );

  await page.goto(`${ficha}/estado`);
  await page.getByRole("button", { name: "Volvió a la residencia" }).click();
  await page.getByRole("link", { name: "Internación o egreso" }).click();
  await page.getByLabel(/^Motivo/).selectOption("traslado");
  await page.getByRole("button", { name: "Registrar egreso" }).click();
  await page.getByRole("button", { name: "Sí, registrar el egreso" }).click();
  await expect(page.getByText(/Egresó el/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Editar datos" })).toHaveCount(0);

  await page.goto("/pacientes");
  await expect(page.getByRole("link", { name: /^(?!Emergencia).*Héctor Benítez/ })).toHaveCount(0);

  await page.goto(`${ficha}?tab=actividad`);
  await expect(page.getByText("Cambió el estado").first()).toBeVisible();
  await expect(page.getByText("Agregó una alergia")).toBeVisible();
  await expect(page.getByText("Confirmó el ingreso")).toBeVisible();
});

test("Cuidador/a ve la ficha, pero no edita ni hace ingresos", async ({ page, browser }) => {
  const organization = await createTestOrganization();
  await onboardAdmin(page, organization);
  const ficha = await admitResident(page, {
    firstName: "Amalia",
    lastName: "Fernández",
    nationalId: "6111222",
    room: "5",
  });
  const credentials = await createUserWithoutEmail(page, {
    name: "Marta Gómez",
    roleName: "Cuidador/a",
  });

  const marta = await newPhone(browser);
  await firstLoginWithTemporaryPassword(marta, credentials);
  await marta.goto(ficha);
  await expect(marta.getByRole("heading", { name: "Amalia Fernández" })).toBeVisible();
  await expect(marta.getByRole("link", { name: "Editar datos" })).toHaveCount(0);
  await expect(marta.getByLabel("Alergia a")).toHaveCount(0);

  for (const path of [`${new URL(ficha).pathname}/editar`, "/ingresos/nuevo", "/ingresos"]) {
    await marta.goto(path);
    await expect(marta).toHaveURL(/\/sin-permiso/);
  }
});
