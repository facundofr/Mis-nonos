import { expect, test } from "@playwright/test";

import { createTestOrganization, onboardAdmin } from "./support/organization";
import {
  createUserWithoutEmail,
  firstLoginWithTemporaryPassword,
  newPhone,
} from "./support/people";
import { admitResident } from "./support/residents";

// Etapa 3.2: legajo documental con fotos privadas y auditadas (F1-ING-04,
// 12.7). La "foto" es una captura de pantalla de la propia prueba: nunca un
// documento real.

test("legajo: la foto se sube, se ve con enlace temporal, la apertura queda auditada y otros roles no la ven", async ({
  page,
  browser,
}) => {
  const organization = await createTestOrganization();
  await onboardAdmin(page, organization);
  const ficha = await admitResident(page, {
    firstName: "Rosa",
    lastName: "Medina",
    nationalId: "7111222",
    room: "3",
  });

  await page.goto(`${ficha}?tab=legajo`);
  const dni = page.getByRole("listitem").filter({ hasText: "DNI original en custodia" });
  await expect(dni.getByText("Falta")).toBeVisible();
  const photo = await page.screenshot({ type: "png" });
  await dni.getByLabel("Elegir archivo").setInputFiles({
    name: "dni-frente.png",
    mimeType: "image/png",
    buffer: photo,
  });
  await expect(dni.getByText("Cargado · 1 archivo")).toBeVisible();

  await dni.getByRole("link", { name: "Ver" }).click();
  const image = page.getByRole("img", { name: /DNI original en custodia, archivo 1/ });
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
    .toBeGreaterThan(0);
  const src = (await image.getAttribute("src"))!;

  // Sin el token firmado, o con uno alterado, el archivo no sale.
  const fileUrl = new URL(src, page.url());
  const withoutToken = new URL(fileUrl.pathname, fileUrl.origin);
  expect((await page.request.get(withoutToken.href)).status()).toBe(403);
  const tampered = new URL(fileUrl);
  tampered.searchParams.set("t", `${Math.floor(Date.now() / 1000) + 3600}.${"a".repeat(43)}`);
  expect((await page.request.get(tampered.href)).status()).toBe(403);
  const ok = await page.request.get(fileUrl.href);
  expect(ok.status()).toBe(200);
  expect(ok.headers()["cache-control"]).toContain("no-store");
  expect(ok.headers()["content-type"]).toBe("image/jpeg");

  await page.goto(`${ficha}?tab=actividad`);
  await expect(page.getByText("Abrió un documento del legajo").first()).toBeVisible();
  await expect(page.getByText("Subió un documento al legajo")).toBeVisible();

  // Asistente ve que el documento está cargado, pero no las fotos (F.3, nota 5).
  const credentials = await createUserWithoutEmail(page, {
    name: "Marta Gómez",
    roleName: "Asistente",
  });
  const marta = await newPhone(browser);
  await firstLoginWithTemporaryPassword(marta, credentials);
  await marta.goto(`${ficha}?tab=legajo`);
  const martaDni = marta.getByRole("listitem").filter({ hasText: "DNI original en custodia" });
  await expect(martaDni.getByText("Cargado · 1 archivo")).toBeVisible();
  await expect(martaDni.getByRole("link", { name: "Ver" })).toHaveCount(0);
  await expect(martaDni.getByLabel("Elegir archivo")).toHaveCount(0);
  expect((await marta.request.get(fileUrl.href)).status()).toBe(403);
});

test("el legajo rechaza archivos que no son fotos ni PDF", async ({ page }) => {
  const organization = await createTestOrganization();
  await onboardAdmin(page, organization);
  const ficha = await admitResident(page, {
    firstName: "Carlos",
    lastName: "Ojeda",
    nationalId: "8111222",
    room: "9",
  });
  await page.goto(`${ficha}?tab=legajo`);
  const item = page.getByRole("listitem").filter({ hasText: "Ficha de ingreso" });
  await item.getByLabel("Elegir archivo").setInputFiles({
    name: "ficha.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("<html><script>alert(1)</script></html>"),
  });
  await expect(item.getByText("Solo se aceptan fotos (JPG, PNG o WebP) y PDF.")).toBeVisible();
  await expect(item.getByText("Falta")).toBeVisible();
});
