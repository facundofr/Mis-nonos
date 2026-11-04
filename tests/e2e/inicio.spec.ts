import { expect, test } from "@playwright/test";

import { createTestOrganization, onboardAdmin } from "./support/organization";
import {
  createUserWithoutEmail,
  firstLoginWithTemporaryPassword,
  newPhone,
} from "./support/people";
import { admitResident } from "./support/residents";

// Etapa 3.6: Inicio de personal y de Dirección (F1-DIR-01). Datos ficticios.

test("Inicio: el personal ve sus pendientes; Administración, además, legajos y actividad", async ({
  page,
  browser,
}) => {
  const organization = await createTestOrganization();
  await onboardAdmin(page, organization);
  await admitResident(page, {
    firstName: "Elena",
    lastName: "Ramírez",
    nationalId: "4512778",
    room: "12",
  });
  const martaCredentials = await createUserWithoutEmail(page, {
    name: "Marta Gómez",
    roleName: "Profesional",
  });

  const marta = await newPhone(browser);
  await firstLoginWithTemporaryPassword(marta, martaCredentials);
  // Novedades está oculta: Inicio no la muestra (lib/navigation/hidden).
  await marta.goto("/inicio");
  await expect(marta.getByRole("region", { name: "Tareas del turno" })).toBeVisible();
  await expect(marta.getByRole("heading", { name: "Novedades recientes" })).toHaveCount(0);
  await expect(marta.getByRole("link", { name: "Nueva novedad" })).toHaveCount(0);
  await expect(marta.getByRole("link", { name: /Pacientes activos\s*1/ })).toBeVisible();
  await expect(marta.getByRole("heading", { name: "Actividad reciente" })).toHaveCount(0);
  await expect(marta.getByRole("heading", { name: "Documentos faltantes" })).toHaveCount(0);

  await page.goto("/inicio");
  const faltantes = page.getByRole("region", { name: "Documentos faltantes" });
  await expect(faltantes.getByRole("link", { name: /Elena Ramírez/ })).toBeVisible();
  const actividad = page.getByRole("region", { name: "Actividad reciente" });
  await expect(actividad.getByText(/confirmó el ingreso/)).toBeVisible();
});
