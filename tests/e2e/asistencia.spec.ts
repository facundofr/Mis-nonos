import { expect, test } from "@playwright/test";

import {
  attendanceToken,
  backdateAttendance,
  createTestOrganization,
  onboardAdmin,
} from "./support/organization";
import {
  createUserWithoutEmail,
  firstLoginWithTemporaryPassword,
  newPhone,
} from "./support/people";

// Asistencia con QR (docs/decisions/0020). Datos ficticios.

test("la cuidadora registra entrada y salida con el QR; Administración ve quién está", async ({
  page,
  browser,
}) => {
  const organization = await createTestOrganization();
  await onboardAdmin(page, organization);
  const credentials = await createUserWithoutEmail(page, {
    name: "Marta Gómez",
    roleName: "Cuidador/a",
  });

  // Administración abre el QR para imprimir; el enlace es el que abre la cámara.
  await page.goto("/configuracion");
  await page.getByRole("link", { name: /Asistencia con QR/ }).click();
  await expect(page.getByRole("heading", { name: "Registrá tu entrada y salida" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Código QR de asistencia" })).toBeVisible();
  const token = await attendanceToken(organization.siteId);
  expect(token).toMatch(/^[0-9a-f]{64}$/);

  // La cuidadora escanea: abrir el enlace no registra; el botón sí.
  const marta = await newPhone(browser);
  await firstLoginWithTemporaryPassword(marta, credentials);
  await marta.goto(`/fichar/${token}`);
  await expect(marta.getByRole("heading", { name: "Registrá tu entrada" })).toBeVisible();
  await expect(marta.getByRole("region", { name: "Quién registra" })).toContainText("Marta Gómez");
  await marta.getByRole("button", { name: "Registrar entrada" }).click();
  await expect(marta.getByText(/Entrada registrada a las \d{2}:\d{2}/)).toBeVisible();
  await expect(marta.getByText("¡Buen turno, Marta!")).toBeVisible();

  // Administración la ve en la residencia, en Inicio y en Personal.
  await page.goto("/inicio");
  await expect(page.getByRole("link", { name: /En la residencia\s*1/ })).toBeVisible();
  await page.goto("/empleados?filtro=adentro");
  const adentro = page.getByRole("list", { name: "En la residencia" });
  await expect(adentro.getByText("Marta Gómez")).toBeVisible();
  await expect(adentro.getByText(/Entró \d{2}:\d{2}/)).toBeVisible();

  // Un rato después (fuera de los 2 minutos del doble toque), la salida.
  await backdateAttendance(organization.siteId, 10);
  await marta.goto(`/fichar/${token}`);
  await expect(marta.getByRole("heading", { name: "Registrá tu salida" })).toBeVisible();
  await marta.getByRole("button", { name: "Registrar salida" }).click();
  await expect(marta.getByText(/Salida registrada a las \d{2}:\d{2}/)).toBeVisible();

  await page.goto("/empleados?filtro=adentro");
  await expect(page.getByText("Nadie registró su entrada")).toBeVisible();

  // Si Administración cambia el código, el QR viejo deja de servir.
  await page.goto("/configuracion/asistencia");
  await page.getByRole("button", { name: "Cambiar el código" }).click();
  await page.getByRole("button", { name: "Sí, cambiar el código" }).click();
  await expect(page.getByText(/el QR cambió/)).toBeVisible();
  await marta.goto(`/fichar/${token}`);
  await expect(marta.getByText("Este código ya no vale: pedí el QR actualizado.")).toBeVisible();
  await expect(marta.getByRole("button", { name: /Registrar/ })).toHaveCount(0);
});
