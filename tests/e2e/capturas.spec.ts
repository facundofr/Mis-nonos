import path from "node:path";

import { devices, expect, test } from "@playwright/test";

import { createTestOrganization, onboardAdmin } from "./support/organization";
import { createUserWithoutEmail } from "./support/people";
import { admitResident } from "./support/residents";

/*
 * Capturas de las pantallas con datos ficticios, para revisar el diseño.
 * No es una prueba: corre solo con CAPTURAS=<carpeta de salida>.
 *   CAPTURAS=./capturas corepack pnpm test:e2e capturas
 */
const output = process.env.CAPTURAS;
test.skip(!output, "Solo con CAPTURAS=<carpeta>");

test("capturas de las pantallas", async ({ page }) => {
  const shot = (name: string) =>
    page.screenshot({ path: path.join(output!, `${name}.png`), fullPage: true });

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      console.log(`[consola ${message.type()}] ${page.url()} :: ${message.text().slice(0, 4000)}`);
    }
  });
  const organization = await createTestOrganization("Residencia Mis Nonos");
  await onboardAdmin(page, organization, { skipWelcome: false });
  // Bienvenida de la primera vez (onboarding): primer paso y el del abono.
  const welcome = page.getByRole("dialog");
  await expect(welcome.getByRole("heading", { name: /Te damos la bienvenida/ })).toBeVisible();
  await page.screenshot({ path: path.join(output!, "movil-bienvenida.png") });
  while ((await welcome.getByRole("heading", { name: "Abono mensual" }).count()) === 0) {
    await welcome.getByRole("button", { name: "Siguiente" }).click();
  }
  await page.screenshot({ path: path.join(output!, "movil-bienvenida-abono.png") });
  await welcome.getByRole("button", { name: "Saltar la guía" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await shot("movil-inicio-puesta-en-marcha");
  await createUserWithoutEmail(page, { name: "Jorge Suárez", roleName: "Profesional" });
  await createUserWithoutEmail(page, { name: "Marta Gómez", roleName: "Profesional" });
  const ficha = await admitResident(page, {
    firstName: "Elena",
    lastName: "Ramírez",
    nationalId: "4512778",
    room: "12",
  });
  await page.getByLabel("Alergia a").fill("Penicilina");
  await page.getByLabel("Reacción").fill("Ronchas");
  await page.getByRole("button", { name: "Agregar alergia" }).click();
  await expect(page.getByText("Alergia a Penicilina agregada.")).toBeVisible();
  await admitResident(page, {
    firstName: "Héctor",
    lastName: "Benítez",
    nationalId: "5111222",
    room: "7",
  });
  const fichaPath = new URL(ficha).pathname;
  const residentId = fichaPath.split("/").at(-1)!;
  for (const [subject, category, content, followUp] of [
    ["general", "Higiene", "Falta reponer guantes en el office del primer piso.", true],
    [
      residentId,
      "Alimentación",
      "No quiso almorzar. Avisar a la familia si repite en la cena.",
      true,
    ],
    [residentId, "Visitas", "Recibió visita de su hija.", false],
  ] as const) {
    await page.goto(`/novedades/nueva?paciente=${subject}`);
    await page.getByText(category, { exact: true }).click();
    await page.getByLabel(/^¿Qué pasó\?/).fill(content);
    if (followUp) await page.getByText("Requiere seguimiento").click();
    await page.getByRole("button", { name: "Guardar novedad" }).click();
    await expect(page.getByText("Novedad registrada.")).toBeVisible();
  }

  // Una solicitud de ingreso cargada a mano.
  await page.goto("/solicitudes/nueva");
  await page.getByLabel(/^Canal/).selectOption("Teléfono");
  await page.getByLabel(/^Nombre \*/).fill("Rosa");
  await page.getByLabel(/^Apellido/).fill("Medina");
  await page.getByLabel("Modalidad").selectOption("Privado");
  await page.getByLabel(/^Nombre y apellido/).fill("Carla Medina");
  await page.getByLabel(/^Teléfono \*/).fill("11 5555 1234");
  await page.getByLabel("Lo que contó la familia").fill("Busca vacante para fin de mes.");
  await page.getByRole("button", { name: "Guardar solicitud" }).click();
  await expect(page.getByText("Solicitud guardada en la bandeja.")).toBeVisible();
  await shot("movil-solicitud");

  // Landing pública (formulario opcional para las familias).
  const slug = `mis-nonos-${Date.now().toString(36)}`;
  await page.goto("/configuracion/formulario-publico");
  await page.getByRole("textbox", { name: "Dirección" }).fill(slug);
  await page
    .getByLabel("Presentación")
    .fill(
      "Somos una casa de familia para adultos mayores, con enfermería las 24 horas y un equipo que conoce a cada residente por su nombre.",
    );
  await page.getByText("Publicar el formulario").click();
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Formulario publicado.")).toBeVisible();
  await shot("movil-config-formulario-publico");
  const visitor = await page
    .context()
    .browser()!
    .newPage({ ...devices["Pixel 7"] });
  for (const [name, url] of [
    ["movil-landing", `/residencia/${slug}`],
    ["movil-landing-paso1", `/residencia/${slug}/solicitar`],
    ["movil-landing-privacidad", `/residencia/${slug}/privacidad`],
    ["movil-landing-enviada", `/residencia/${slug}/enviada`],
  ] as const) {
    await visitor.goto(url);
    await visitor.screenshot({ path: path.join(output!, `${name}.png`), fullPage: true });
  }
  await visitor.goto(`/residencia/${slug}/solicitar`);
  await visitor.getByRole("textbox", { name: "Nombre *", exact: true }).fill("Rosa");
  await visitor.getByRole("textbox", { name: "Apellido *" }).fill("Medina");
  await visitor.getByLabel(/^Fecha de nacimiento/).fill("1940-05-02");
  await visitor.getByLabel(/^Modalidad/).selectOption("Privado");
  await visitor.getByRole("button", { name: "Siguiente" }).click();
  await visitor.screenshot({
    path: path.join(output!, "movil-landing-paso2.png"),
    fullPage: true,
  });
  await visitor.setViewportSize({ width: 1366, height: 860 });
  await visitor.goto(`/residencia/${slug}`);
  await visitor.screenshot({ path: path.join(output!, "escritorio-landing.png"), fullPage: true });
  await visitor.close();

  for (const [name, url] of [
    ["movil-pacientes", "/pacientes"],
    ["movil-ficha", fichaPath],
    ["movil-ficha-contactos", `${fichaPath}?tab=contactos`],
    ["movil-ficha-legajo", `${fichaPath}?tab=legajo`],
    ["movil-ficha-actividad", `${fichaPath}?tab=actividad`],
    ["movil-emergencia", fichaPath + "/emergencia"],
    ["movil-notificaciones", "/notificaciones"],
    ["movil-novedades", "/novedades"],
    ["movil-nueva-novedad", "/novedades/nueva"],
    ["movil-nueva-novedad-form", `/novedades/nueva?paciente=${residentId}`],
    ["movil-ficha-novedades", `${fichaPath}?tab=novedades`],
    ["movil-ficha-abono", fichaPath + "?tab=abono"],
    ["movil-abonos", "/abonos"],
    ["movil-solicitudes", "/solicitudes"],
    ["movil-nueva-solicitud", "/solicitudes/nueva"],
    ["movil-turno", "/turno"],
    ["movil-turno-historial", "/turno/historial"],
    ["movil-ingreso-paso1", "/ingresos/nuevo"],
    ["movil-inicio", "/inicio"],
    ["movil-mas", "/mas"],
    ["movil-usuarios", "/usuarios"],
    ["movil-invitar", "/usuarios/invitar"],
    ["movil-empleados", "/empleados"],
    ["movil-configuracion", "/configuracion"],
    ["movil-turnos", "/configuracion/turnos"],
  ] as const) {
    await page.goto(url);
    await expect(page.locator("main")).toBeVisible();
    await shot(name);
  }

  await page.setViewportSize({ width: 1366, height: 860 });
  for (const [name, url] of [
    ["escritorio-pacientes", "/pacientes"],
    ["escritorio-inicio", "/inicio"],
    ["escritorio-novedades", "/novedades"],
    ["escritorio-turno", "/turno"],
    ["escritorio-abono", fichaPath + "?tab=abono"],
    ["escritorio-abonos", "/abonos"],
    ["escritorio-solicitudes", "/solicitudes"],
    ["escritorio-ficha", fichaPath],
    ["escritorio-emergencia", fichaPath + "/emergencia"],
    ["escritorio-usuarios", "/usuarios"],
    ["escritorio-residencia", "/configuracion/residencia"],
  ] as const) {
    await page.goto(url);
    await shot(name);
  }
});
