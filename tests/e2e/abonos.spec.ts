import { expect, test } from "@playwright/test";

import { createTestOrganization, onboardAdmin } from "./support/organization";
import {
  createUserWithoutEmail,
  firstLoginWithTemporaryPassword,
  newPhone,
} from "./support/people";
import { admitResident } from "./support/residents";

// Etapa 3.8: abono al ingresar y cambio de precio (F1-FEE-01), cuotas y
// pagos parciales (F1-FEE-02) y quién ve los montos (12.10). Datos ficticios.

test("abono: primer mes cobrado, pago parcial y total, cambio de precio y lista del mes", async ({
  page,
  browser,
}) => {
  const organization = await createTestOrganization();
  await onboardAdmin(page, organization);
  const ficha = await admitResident(page, {
    firstName: "Elena",
    lastName: "Ramírez",
    nationalId: "4512778",
    room: "12",
    fee: "450.000",
  });

  await page.goto(`${new URL(ficha).pathname}?tab=abono`);
  await expect(page.getByText("$ 450.000,00").first()).toBeVisible();
  const cuotas = page.getByRole("region", { name: "Cuotas" });
  await expect(cuotas.getByText("Pagada")).toBeVisible();
  await expect(cuotas.getByText("Pendiente")).toBeVisible();

  // Pago parcial y después el resto.
  await cuotas.locator("summary", { hasText: "Registrar pago" }).click();
  await cuotas.getByLabel(/^Monto/).fill("200.000");
  await cuotas.getByRole("button", { name: "Registrar pago" }).click();
  await expect(page.getByText(/saldo \$ 250\.000,00/).first()).toBeVisible();
  await page.reload();
  await cuotas.locator("summary", { hasText: "Registrar pago" }).click();
  await cuotas.getByRole("button", { name: "Registrar pago" }).click();
  await expect(cuotas.getByText("Pagada")).toHaveCount(2);
  await page.reload();
  await expect(cuotas.getByText("Pendiente")).toHaveCount(0);
  await expect(cuotas.getByText("Pagada")).toHaveCount(2);

  // Cambio de precio: queda el historial.
  const precio = page.getByRole("region", { name: "Precio" });
  await precio.getByLabel(/^Precio nuevo/).fill("480.000");
  await precio.getByLabel(/^Motivo/).fill("Aumento anual");
  await page.getByRole("button", { name: "Cambiar precio" }).click();
  await expect(page.getByText(/Precio actualizado/)).toBeVisible();
  await expect(page.getByText("$ 480.000,00").first()).toBeVisible();
  await expect(page.getByText(/Aumento anual/)).toBeVisible();

  // La lista "Abonos" del mes.
  await page.goto("/abonos");
  await expect(page.getByRole("heading", { name: "Abonos" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Elena Ramírez/ })).toBeVisible();

  // Cuidado no ve montos: ni la pestaña ni la lista.
  const credentials = await createUserWithoutEmail(page, {
    name: "Marta Gómez",
    roleName: "Cuidador/a",
  });
  const marta = await newPhone(browser);
  await firstLoginWithTemporaryPassword(marta, credentials);
  await marta.goto(new URL(ficha).pathname);
  await expect(marta.getByRole("link", { name: "Abono", exact: true })).toHaveCount(0);
  await marta.goto(`${new URL(ficha).pathname}?tab=abono`);
  await expect(marta.getByText("$ 450.000,00")).toHaveCount(0);
  await marta.goto("/abonos");
  await expect(marta).toHaveURL(/\/sin-permiso/);
});
