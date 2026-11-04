import { expect, type Page } from "@playwright/test";

/** Datos ficticios de un paciente para las pruebas. */
export interface TestResident {
  firstName: string;
  lastName: string;
  nationalId: string;
  room: string;
}

/**
 * Ingreso guiado completo (7.3-C2) con un responsable. Termina en la ficha
 * del paciente y devuelve su URL.
 */
export async function admitResident(page: Page, resident: TestResident): Promise<string> {
  await page.goto("/ingresos/nuevo");
  await page.getByLabel(/^Nombre/).fill(resident.firstName);
  await page.getByLabel(/^Apellido/).fill(resident.lastName);
  await page.getByLabel("DNI", { exact: true }).fill(resident.nationalId);
  await page.getByLabel("Nacimiento", { exact: true }).fill("1942-03-14");
  await page.getByLabel("Habitación").fill(resident.room);
  await page.getByLabel("N.º de beneficiario PAMI").fill("15-0452778-0-00");
  await page.getByLabel("Indicaciones especiales").fill("Dieta de textura blanda.");
  await page.getByRole("button", { name: "Siguiente: responsable" }).click();

  await expect(page).toHaveURL(/\/ingresos\/[0-9a-f-]+\/responsable/);
  await page.getByLabel(/^Nombre y apellido/).fill(`Silvia ${resident.lastName}`);
  await page.getByLabel("Vínculo").selectOption("Hijo/a");
  await page.getByLabel(/^DNI del responsable/).fill("20111222");
  await page.getByLabel(/^Domicilio del responsable/).fill("Calle Falsa 123");
  await page.getByLabel("Celular", { exact: true }).fill("11 5821-4430");
  await page.getByLabel("Tiene WhatsApp en el celular").check();
  await page.getByRole("button", { name: "Guardar contacto" }).click();
  await expect(page.getByText("Responsable de la internación").first()).toBeVisible();
  await page.getByRole("button", { name: "Siguiente: documentación" }).click();

  await expect(page).toHaveURL(/\/documentos/);
  await page.getByRole("button", { name: "Siguiente: revisar" }).click();
  await expect(page).toHaveURL(/\/confirmar/);
  await page.getByRole("button", { name: "Confirmar ingreso" }).click();
  await expect(page.getByText(/Ingreso confirmado/)).toBeVisible();
  return page.url().split("?")[0]!;
}
