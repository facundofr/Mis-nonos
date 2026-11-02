import { expect, test } from "@playwright/test";

import { totp } from "@/tests/support/totp";

import { createTestOrganization, onboardAdmin, PASSWORD } from "./support/organization";

// Alta de una residencia (DC-12) y primer ingreso con 2FA (DC-10, 10.10).

test("la primera administradora acepta la invitación, activa el 2FA y entra", async ({ page }) => {
  const organization = await createTestOrganization();
  await onboardAdmin(page, organization);

  await expect(page.getByRole("heading", { name: /, Laura$/ })).toBeVisible();
  await page.goto("/perfil");
  await expect(page.getByText("Verificación en dos pasos activada")).toBeVisible();
});

test("después de salir, vuelve a entrar con contraseña y código", async ({ page }) => {
  const organization = await createTestOrganization();
  const { secret } = await onboardAdmin(page, organization);

  await page.goto("/mas");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/ingresar/);

  await page.getByLabel("Email o usuario").fill(organization.adminEmail);
  await page.getByLabel("Contraseña", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/ingresar\/codigo/);

  // Espera un nuevo período de 30 s si el código ya se usó al activar.
  await page.getByLabel("Código de 6 dígitos").fill(totp(secret, Date.now() + 30_000));
  await page.getByRole("button", { name: "Verificar" }).click();
  await expect(page).toHaveURL(/\/inicio/);
});

test("una contraseña incorrecta no entra y no dice si la cuenta existe", async ({ page }) => {
  const organization = await createTestOrganization();
  await page.goto("/ingresar");
  await page.getByLabel("Email o usuario").fill(organization.adminEmail);
  await page.getByLabel("Contraseña", { exact: true }).fill("una contraseña equivocada");
  await page.getByRole("button", { name: "Ingresar" }).click();
  // Por texto: Next.js tiene su propio role="alert" (el anunciador de rutas).
  await expect(
    page.getByText("El email, el usuario o la contraseña no son correctos."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/ingresar$/);
});
