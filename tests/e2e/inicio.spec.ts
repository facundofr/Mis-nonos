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
  await marta.goto("/novedades/nueva?paciente=general");
  await marta.getByText("Higiene", { exact: true }).click();
  await marta.getByLabel(/^¿Qué pasó\?/).fill("Falta reponer guantes en el office.");
  await marta.getByText("Requiere seguimiento").click();
  await marta.getByRole("button", { name: "Guardar novedad" }).click();
  await expect(marta.getByText("Novedad registrada.")).toBeVisible();

  await marta.goto("/inicio");
  const tareas = marta.getByRole("region", { name: "Tareas del turno" });
  await expect(tareas.getByText("Falta reponer guantes en el office.")).toBeVisible();
  await expect(marta.getByRole("link", { name: /Pacientes activos\s*1/ })).toBeVisible();
  await expect(marta.getByRole("heading", { name: "Actividad reciente" })).toHaveCount(0);
  await expect(marta.getByRole("heading", { name: "Documentos faltantes" })).toHaveCount(0);

  await page.goto("/inicio");
  const faltantes = page.getByRole("region", { name: "Documentos faltantes" });
  await expect(faltantes.getByRole("link", { name: /Elena Ramírez/ })).toBeVisible();
  const actividad = page.getByRole("region", { name: "Actividad reciente" });
  await expect(actividad.getByText(/Marta Gómez · registró una novedad/)).toBeVisible();
  await expect(actividad.getByText(/confirmó el ingreso/)).toBeVisible();
});
