import { expect, test } from "@playwright/test";

import { alignShiftsToNow, createTestOrganization, onboardAdmin } from "./support/organization";
import {
  createUserWithoutEmail,
  firstLoginWithTemporaryPassword,
  newPhone,
} from "./support/people";
import { admitResident } from "./support/residents";

// Etapa 3.5: traspaso de turno con confirmación por sede (F1-TUR-01, F.4).
// Los turnos se corren para que el actual termine en 30 minutos.

test("se entrega el turno con sus pendientes y el entrante confirma la recepción", async ({
  page,
  browser,
}) => {
  const organization = await createTestOrganization();
  await alignShiftsToNow(organization.siteId);
  await onboardAdmin(page, organization);

  await page.goto("/configuracion/residencia");
  const confirmation = page.getByRole("checkbox", { name: /El turno entrante confirma/ });
  await confirmation.check();
  await expect(confirmation).toBeChecked();
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Los datos de la residencia quedaron guardados.")).toBeVisible();
  await page.reload();
  await expect(confirmation).toBeChecked();

  await admitResident(page, {
    firstName: "Elena",
    lastName: "Ramírez",
    nationalId: "4512778",
    room: "12",
  });
  const martaCredentials = await createUserWithoutEmail(page, {
    name: "Marta Gómez",
    roleName: "Cuidador/a",
  });
  const jorgeCredentials = await createUserWithoutEmail(page, {
    name: "Jorge Suárez",
    roleName: "Enfermería",
  });

  // Marta registra un seguimiento y entrega el turno.
  const marta = await newPhone(browser);
  await firstLoginWithTemporaryPassword(marta, martaCredentials);
  await marta.goto("/novedades/nueva");
  await marta.getByRole("link", { name: /Elena Ramírez/ }).click();
  await marta.getByText("Estado general", { exact: true }).click();
  await marta.getByLabel(/^¿Qué pasó\?/).fill("Enrojecimiento en el talón derecho.");
  await marta.getByText("Requiere seguimiento").click();
  await marta.getByRole("button", { name: "Guardar novedad" }).click();
  await expect(marta.getByText("Novedad registrada.")).toBeVisible();

  await marta.getByRole("link", { name: "Turno", exact: true }).click();
  await expect(marta.getByRole("heading", { name: "Traspaso de turno" })).toBeVisible();
  await expect(marta.getByRole("heading", { name: "Entregar el turno" })).toBeVisible();
  await expect(
    marta.getByRole("region", { name: "Quedan pendientes" }).getByText(/Enrojecimiento/),
  ).toBeVisible();
  await marta
    .getByLabel("Nota para el turno entrante")
    .fill("Elena: revisar el talón en el cambio postural.");
  await marta.getByRole("button", { name: "Entregar turno" }).click();
  await expect(marta.getByText("Entregado", { exact: true })).toBeVisible();
  await expect(marta.getByText("Falta confirmar la recepción")).toBeVisible();

  // Jorge, del turno entrante, lo recibe y confirma.
  const jorge = await newPhone(browser);
  await firstLoginWithTemporaryPassword(jorge, jorgeCredentials);
  await jorge.goto("/turno");
  await expect(jorge.getByRole("region", { name: "Nota para el turno entrante" })).toContainText(
    "Elena: revisar el talón en el cambio postural.",
  );
  await jorge.getByRole("button", { name: "Confirmar la recepción" }).click();
  await expect(jorge.getByText("Recepción confirmada")).toBeVisible();

  // Confirmado: ya no se cambia la entrega.
  await marta.goto("/turno");
  await expect(
    marta.getByRole("button", { name: /Entregar turno|Actualizar la entrega/ }),
  ).toHaveCount(0);

  await jorge.goto("/turno/historial");
  await expect(jorge.getByText("Confirmado").first()).toBeVisible();
});
