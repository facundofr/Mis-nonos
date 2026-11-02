import { expect, test } from "@playwright/test";

import { createTestOrganization, onboardAdmin } from "./support/organization";
import {
  createUserWithoutEmail,
  firstLoginWithTemporaryPassword,
  newPhone,
} from "./support/people";
import { admitResident } from "./support/residents";

// Etapa 3.4: novedades con categorías y versiones (F1-NOV-01) y
// seguimiento simple (F1-NOV-02), con las reglas de F.4. Datos ficticios.

test("Cuidador/a registra y corrige; Enfermería resuelve; queda el historial", async ({
  page,
  browser,
}) => {
  const organization = await createTestOrganization();
  await onboardAdmin(page, organization);
  const ficha = await admitResident(page, {
    firstName: "Héctor",
    lastName: "Benítez",
    nationalId: "5111222",
    room: "7",
  });
  const martaCredentials = await createUserWithoutEmail(page, {
    name: "Marta Gómez",
    roleName: "Cuidador/a",
  });
  const jorgeCredentials = await createUserWithoutEmail(page, {
    name: "Jorge Suárez",
    roleName: "Enfermería",
  });

  // Marta, desde el botón central "+" de la barra.
  const marta = await newPhone(browser);
  await firstLoginWithTemporaryPassword(marta, martaCredentials);
  await marta.goto("/novedades");
  await marta.getByRole("link", { name: "Registrar una novedad" }).click();
  await expect(marta.getByRole("heading", { name: "Nueva novedad" })).toBeVisible();
  await marta.getByRole("link", { name: /Héctor Benítez/ }).click();
  await marta.getByRole("button", { name: "Guardar novedad" }).click();
  await expect(marta.getByText("Elegí una categoría.")).toBeVisible();
  await expect(marta.getByText("Escribí qué pasó.")).toBeVisible();
  await marta.getByText("Alimentación", { exact: true }).click();
  await marta.getByLabel(/^¿Qué pasó\?/).fill("No quiso almorzar.");
  await marta.getByText("Requiere seguimiento").click();
  await marta.getByRole("button", { name: "Guardar novedad" }).click();
  await expect(marta.getByText("Novedad registrada.")).toBeVisible();
  await expect(marta.getByRole("link", { name: "Pendientes · 1" })).toBeVisible();
  await expect(marta.getByText("No quiso almorzar.")).toBeVisible();

  // La autora corrige: versión nueva.
  await marta.getByText("No quiso almorzar.").click();
  await marta.getByRole("link", { name: "Corregir" }).click();
  await marta
    .getByLabel(/^¿Qué pasó\?/)
    .fill("No quiso almorzar. Avisar a la familia si repite en la cena.");
  await marta.getByRole("button", { name: "Guardar corrección" }).click();
  await expect(marta.getByText(/Corrección guardada/)).toBeVisible();

  // Una novedad General.
  await marta.goto("/novedades/nueva");
  await marta.getByRole("link", { name: /^General/ }).click();
  await marta.getByText("Estado general", { exact: true }).click();
  await marta.getByLabel(/^¿Qué pasó\?/).fill("Falta reponer guantes en el office.");
  await marta.getByRole("button", { name: "Guardar novedad" }).click();
  await expect(marta.getByText("Novedad registrada.")).toBeVisible();

  // Jorge (Enfermería) ve el pendiente, no puede corregir, y lo resuelve.
  const jorge = await newPhone(browser);
  await firstLoginWithTemporaryPassword(jorge, jorgeCredentials);
  await jorge.goto("/novedades");
  await expect(jorge.getByRole("link", { name: "Pendientes · 1" })).toBeVisible();
  await jorge.getByText(/Avisar a la familia si repite/).click();
  await expect(jorge.getByRole("link", { name: "Corregir" })).toHaveCount(0);
  await expect(jorge.getByText("Versión 2 (vigente)")).toBeVisible();
  await expect(jorge.getByText("Original")).toBeVisible();
  await jorge.getByLabel("Comentario (opcional)").fill("Cenó bien. Se avisó a la hija.");
  await jorge.getByRole("button", { name: "Marcar como resuelta" }).click();
  await expect(jorge.getByText(/Resuelto por Jorge Suárez/)).toBeVisible();

  await jorge.goto("/novedades");
  await expect(jorge.getByRole("link", { name: "Pendientes · 0" })).toBeVisible();

  // En la ficha: pestaña Novedades y la actividad.
  const fichaPath = new URL(ficha).pathname;
  await jorge.goto(`${fichaPath}?tab=novedades`);
  await expect(jorge.getByText(/Avisar a la familia si repite/)).toBeVisible();
  await expect(jorge.getByText("Resuelta", { exact: true })).toBeVisible();
  await expect(jorge.getByText("Falta reponer guantes")).toHaveCount(0);
  await jorge.goto(`${fichaPath}?tab=actividad`);
  await expect(jorge.getByText("Resolvió un seguimiento")).toBeVisible();
  await expect(jorge.getByText("Corrigió una novedad")).toBeVisible();
  await expect(jorge.getByText("Registró una novedad")).toBeVisible();
});
