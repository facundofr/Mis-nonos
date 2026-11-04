import { expect, test } from "@playwright/test";

import {
  activateTwoFactor,
  createTestOrganization,
  makeMaster,
  onboardAdmin,
} from "./support/organization";
import {
  createUserWithoutEmail,
  firstLoginWithTemporaryPassword,
  newPhone,
} from "./support/people";
import { admitResident } from "./support/residents";

// Etapa 3.3: ficha de emergencia (F1-EMG-01), hoja de derivación en PDF
// (F1-EMG-02), auditoría de aperturas (F1-EMG-03) y aviso al Master
// (DC-02, F1-NOT-01, docs/decisions/0021). Datos ficticios.

test("Asistente abre la ficha de emergencia; el Master recibe el aviso y todo queda auditado", async ({
  page,
  browser,
}) => {
  const organization = await createTestOrganization();
  await onboardAdmin(page, organization);

  await page.goto("/configuracion/residencia");
  await page.getByLabel("Nombre", { exact: true }).fill("Medicardio");
  await page.getByLabel("Teléfono", { exact: true }).fill("0810 555 0000");
  await page.getByLabel("N.º de cliente").fill("C-12345");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Los datos de la residencia quedaron guardados.")).toBeVisible();

  const ficha = await admitResident(page, {
    firstName: "Elena",
    lastName: "Ramírez",
    nationalId: "4512778",
    room: "12",
  });
  await page.getByLabel("Alergia a").fill("Penicilina");
  await page.getByLabel("Reacción").fill("Ronchas");
  await page.getByRole("button", { name: "Agregar alergia" }).click();
  await expect(page.getByText("Alergia a Penicilina agregada.")).toBeVisible();

  const masterCredentials = await createUserWithoutEmail(page, {
    name: "Sofía Medina",
    roleName: "Administración",
  });
  await makeMaster(masterCredentials.username);
  const cuidadoCredentials = await createUserWithoutEmail(page, {
    name: "Marta Gómez",
    roleName: "Asistente",
  });

  const sofia = await newPhone(browser);
  await firstLoginWithTemporaryPassword(sofia, masterCredentials);
  await activateTwoFactor(sofia);

  // Asistente: desde la lista, el botón Emergencia.
  const marta = await newPhone(browser);
  await firstLoginWithTemporaryPassword(marta, cuidadoCredentials);
  await marta.goto("/pacientes");
  await marta.getByRole("link", { name: "Emergencia de Elena Ramírez" }).click();
  await expect(marta.getByText("Ficha de emergencia", { exact: true })).toBeVisible();
  await expect(marta.getByRole("heading", { name: "Alergia a penicilina" })).toBeVisible();
  await expect(marta.getByText("Reacción: ronchas")).toBeVisible();
  const calls = marta.getByRole("link", { name: /Llamar/ });
  await expect(calls.first()).toContainText("Emergencias · Medicardio");
  await expect(calls.first()).toHaveAttribute("href", "tel:08105550000");
  await expect(calls.nth(1)).toContainText("Silvia Ramírez");
  await expect(marta.getByText(/Queda registrado que abriste esta ficha/)).toBeVisible();

  // Hoja de derivación: un PDF real.
  const pdf = await marta.request.get(
    `${new URL(ficha).pathname.replace("/pacientes/", "/api/emergencia/")}/hoja`,
  );
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

  // El Master recibe el aviso (lo crea el worker a partir del evento).
  await expect
    .poll(
      async () => {
        await sofia.goto("/notificaciones");
        return sofia.getByText("Se abrió una ficha de emergencia").count();
      },
      { timeout: 30_000, intervals: [1_000, 2_000, 3_000] },
    )
    .toBeGreaterThan(0);
  await expect(
    sofia.getByText(/Marta Gómez abrió la ficha de emergencia de Elena Ramírez/),
  ).toBeVisible();
  await expect(sofia.getByRole("link", { name: /Notificaciones: 1 sin leer/ })).toBeVisible();
  await sofia.getByRole("link", { name: /Se abrió una ficha de emergencia/ }).click();
  await expect(sofia.getByText("Abrió la ficha de emergencia").first()).toBeVisible();
  await expect(sofia.getByText("Generó la hoja de derivación")).toBeVisible();

  // Y lo ve en el registro de cambios, que Administración no tiene.
  await sofia.goto("/registro?tipo=aperturas");
  await expect(sofia.getByText("Abrió la ficha de emergencia").first()).toBeVisible();
  await expect(sofia.getByRole("link", { name: "Elena Ramírez" }).first()).toBeVisible();
  await page.goto("/registro");
  await expect(page).toHaveURL(/\/sin-permiso/);

  // Administración no recibe ese aviso.
  await page.goto("/notificaciones");
  await expect(page.getByText("Sin notificaciones")).toBeVisible();
});
