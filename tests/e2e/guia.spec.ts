import { expect, test } from "@playwright/test";

import { createTestOrganization, onboardAdmin } from "./support/organization";
import {
  createUserWithoutEmail,
  firstLoginWithTemporaryPassword,
  newPhone,
} from "./support/people";

// Guía de la primera vez (onboarding): bienvenida según el rol, consejos
// por pantalla, puesta en marcha de Administración y "Volver a ver la guía".

test("Administración: bienvenida, lista de puesta en marcha y consejos", async ({ page }) => {
  const organization = await createTestOrganization();
  await onboardAdmin(page, organization, { skipWelcome: false });

  // Al terminar el alta, sin recargar, aparece la bienvenida.
  const welcome = page.getByRole("dialog");
  await expect(
    welcome.getByRole("heading", { name: "Te damos la bienvenida, Laura" }),
  ).toBeVisible();
  await expect(welcome.getByText(/Paso 1 de \d/)).toBeVisible();
  const steps = Number(
    /de (\d+)/.exec((await welcome.getByText(/Paso 1 de/).textContent()) ?? "")![1],
  );
  for (let step = 1; step < steps; step++) {
    await welcome.getByRole("button", { name: "Siguiente" }).click();
  }
  await expect(welcome.getByRole("heading", { name: "Dejá todo listo" })).toHaveCount(0);
  await expect(welcome.getByRole("heading", { name: "Cuidamos los datos" })).toBeVisible();
  await welcome.getByRole("button", { name: "Empezar" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Ya vista: no vuelve a aparecer.
  await page.reload();
  await expect(page.getByRole("heading", { name: /^Buen(os|as) .*, Laura$/ })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Puesta en marcha: se completa con los datos reales.
  const setup = page.getByRole("region", { name: /Puesta en marcha/ });
  await expect(setup.getByRole("heading", { name: "Puesta en marcha · 0 de 5" })).toBeVisible();
  await setup.getByRole("button", { name: "Ya los revisé" }).click();
  await expect(setup.getByRole("heading", { name: "Puesta en marcha · 1 de 5" })).toBeVisible();

  // Consejo de la primera vez en Pacientes.
  await page.goto("/pacientes");
  const tip = page.getByRole("complementary", { name: "Consejo" });
  await expect(tip.getByText("Buscá rápido")).toBeVisible();
  await tip.getByRole("button", { name: "Entendido" }).click();
  await expect(page.getByRole("complementary", { name: "Consejo" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("complementary", { name: "Consejo" })).toHaveCount(0);

  // "Volver a ver la guía" lo muestra todo de nuevo.
  await page.goto("/perfil");
  await page.getByRole("button", { name: "Volver a ver la guía" }).click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: /Te damos la bienvenida/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Saltar la guía" }).click();
  await page.goto("/pacientes");
  await expect(page.getByRole("complementary", { name: "Consejo" })).toBeVisible();
});

test("Cuidador/a: la bienvenida muestra solo lo que puede hacer", async ({ page, browser }) => {
  const organization = await createTestOrganization();
  await onboardAdmin(page, organization);
  const credentials = await createUserWithoutEmail(page, {
    name: "Marta Gómez",
    roleName: "Cuidador/a",
  });

  const marta = await newPhone(browser, { skipWelcome: false });
  await firstLoginWithTemporaryPassword(marta, credentials);
  const welcome = marta.getByRole("dialog");
  await expect(
    welcome.getByRole("heading", { name: "Te damos la bienvenida, Marta" }),
  ).toBeVisible();
  const titles: string[] = [];
  for (;;) {
    titles.push((await welcome.getByRole("heading").textContent()) ?? "");
    const next = welcome.getByRole("button", { name: "Siguiente" });
    if ((await next.count()) === 0) break;
    await next.click();
  }
  expect(titles).toEqual([
    "Te damos la bienvenida, Marta",
    "Pacientes y emergencia",
    "Novedades con el botón «+»",
    "Traspaso de turno",
    "Cuidamos los datos",
  ]);
  await welcome.getByRole("button", { name: "Empezar" }).click();
  await expect(marta.getByRole("dialog")).toHaveCount(0);
  // Sin la lista de puesta en marcha (es de Administración).
  await marta.goto("/inicio");
  await expect(marta.getByRole("region", { name: /Puesta en marcha/ })).toHaveCount(0);
});
