import { expect, test } from "@playwright/test";

import {
  createTestOrganization,
  makeMaster,
  onboardAdmin,
  PASSWORD,
  settleWelcome,
} from "./support/organization";
import {
  createUserWithoutEmail,
  firstLoginWithTemporaryPassword,
  mailpitLatestText,
  mailpitMessagesTo,
  newPhone,
  suffix,
} from "./support/people";

// Etapa 3.1: usuarios y roles (F1-USR-01), personal sin email (DC-11) y
// permisos por rol (F.3). Datos ficticios.

test("Administración invita por email; la persona acepta y entra con su rol", async ({
  page,
  browser,
}) => {
  const organization = await createTestOrganization();
  await onboardAdmin(page, organization);

  const email = `marta-${suffix()}@prueba.test`;
  await page.goto("/usuarios/agregar");
  await page.getByRole("link", { name: "Invitar con enlace" }).click();
  await expect(page.getByRole("heading", { name: "Invitar usuario" })).toBeVisible();
  await page.getByLabel("Nombre y apellido").fill("Marta Gómez");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Teléfono").fill("11 4011 2234");
  await page.getByRole("radio", { name: /^Asistente/ }).check();
  await page.getByRole("button", { name: "Enviar invitación" }).click();
  await expect(page.getByText(`Invitación enviada a ${email}`)).toBeVisible();
  const link = (await page.locator("code").textContent()) ?? "";
  expect(link).toContain("/invitacion/");

  // El email salió por SMTP (Mailpit en desarrollo).
  await expect.poll(async () => (await mailpitMessagesTo(email)).length).toBeGreaterThan(0);

  const marta = await newPhone(browser);
  await marta.goto(link);
  await marta.getByLabel("Contraseña nueva").fill(PASSWORD);
  await marta.getByLabel("Repetí la contraseña").fill(PASSWORD);
  await marta.getByRole("button", { name: "Crear contraseña e ingresar" }).click();
  // Asistente no necesita 2FA: entra directo.
  await expect(marta).toHaveURL(/\/inicio/);
  await settleWelcome(marta);
  await expect(marta.getByRole("heading", { name: /, Marta$/ })).toBeVisible();

  // Sin permiso de usuarios: ni el menú ni la pantalla.
  await marta.goto("/mas");
  await expect(marta.getByRole("link", { name: "Personal" })).toBeVisible();
  await expect(marta.getByRole("link", { name: "Usuarios y roles" })).toHaveCount(0);
  await marta.goto("/usuarios");
  await expect(marta).toHaveURL(/\/sin-permiso/);

  await page.goto("/usuarios");
  await expect(page.getByRole("link", { name: /Marta Gómez/ })).toContainText("Activo");
});

test("Administración agrega un usuario con email; le llega la contraseña provisoria y elige la suya", async ({
  page,
  browser,
}) => {
  const organization = await createTestOrganization();
  await onboardAdmin(page, organization);

  const email = `elena-${suffix()}@prueba.test`;
  await page.goto("/usuarios");
  await page.getByRole("link", { name: "Agregar usuario" }).click();
  await expect(page.getByRole("heading", { name: "Agregar usuario" })).toBeVisible();
  await page.getByLabel("Nombre y apellido").fill("Elena Ruiz");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("radio", { name: /^Profesional/ }).check();
  // Profesional lleva la profesión escrita a mano (docs/decisions/0021).
  await page.getByRole("button", { name: "Crear usuario y mandar contraseña" }).click();
  await expect(page.getByText("Escribí la profesión, por ejemplo Kinesiólogo.")).toBeVisible();
  await page.getByLabel("Profesión").fill("Kinesióloga");
  await page.getByRole("button", { name: "Crear usuario y mandar contraseña" }).click();
  await expect(
    page.getByText(`Listo: le mandamos a ${email} su contraseña provisoria.`),
  ).toBeVisible();

  let text = "";
  await expect
    .poll(async () => (text = await mailpitLatestText(email)))
    .toContain("Contraseña provisoria:");
  const temporaryPassword = /Contraseña provisoria: (\S+)/.exec(text)?.[1] ?? "";
  expect(temporaryPassword).toMatch(/^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/);

  const elena = await newPhone(browser);
  await elena.goto("/ingresar");
  await elena.getByLabel("Email o usuario").fill(email);
  await elena.getByLabel("Contraseña", { exact: true }).fill(temporaryPassword);
  await elena.getByRole("button", { name: "Ingresar" }).click();
  await expect(elena).toHaveURL(/\/cambiar-contrasena/);
  await elena.getByLabel("Contraseña que te dieron").fill(temporaryPassword);
  await elena.getByLabel(/^Contraseña nueva/).fill(PASSWORD);
  await elena.getByLabel("Repetí la contraseña nueva").fill(PASSWORD);
  await elena.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(elena).not.toHaveURL(/cambiar-contrasena/);
  // Entró con su rol: la recibe la guía de bienvenida.
  await expect(elena.getByRole("heading", { name: "Te damos la bienvenida, Elena" })).toBeVisible();
});

test("alguien sin email entra con usuario y elige su contraseña al primer ingreso", async ({
  page,
  browser,
}) => {
  const organization = await createTestOrganization();
  await onboardAdmin(page, organization);
  const credentials = await createUserWithoutEmail(page, {
    name: "Jorge Suárez",
    roleName: "Profesional",
  });

  const jorge = await newPhone(browser);
  await firstLoginWithTemporaryPassword(jorge, credentials);
  await expect(jorge.getByRole("heading", { name: /, Jorge$/ })).toBeVisible();

  // La provisoria ya no sirve.
  await jorge.goto("/mas");
  await jorge.getByRole("button", { name: "Cerrar sesión" }).click();
  await jorge.getByLabel("Email o usuario").fill(credentials.username);
  await jorge.getByLabel("Contraseña", { exact: true }).fill(credentials.temporaryPassword);
  await jorge.getByRole("button", { name: "Ingresar" }).click();
  await expect(
    jorge.getByText("El email, el usuario o la contraseña no son correctos."),
  ).toBeVisible();
});

test("desactivar a alguien le corta el acceso en el momento", async ({ page, browser }) => {
  const organization = await createTestOrganization();
  await onboardAdmin(page, organization);
  const credentials = await createUserWithoutEmail(page, {
    name: "Héctor Benítez",
    roleName: "Asistente",
  });
  const memberUrl = page.url().split("?")[0]!;

  const hector = await newPhone(browser);
  await firstLoginWithTemporaryPassword(hector, credentials);

  await page.goto(memberUrl);
  await page.getByRole("button", { name: "Desactivar a Héctor" }).click();
  await page.getByRole("button", { name: "Sí, desactivar" }).click();
  await expect(page.getByText("La persona ya no puede entrar.")).toBeVisible();

  await hector.goto("/empleados");
  await expect(hector).toHaveURL(/\/ingresar/);
});

test("Administración no se puede desactivar ni cambiar su propio rol", async ({ page }) => {
  const organization = await createTestOrganization();
  await onboardAdmin(page, organization);
  await page.goto("/usuarios");
  await page.getByRole("link", { name: /Laura Pereyra/ }).click();
  await expect(page.getByRole("button", { name: /Desactivar/ })).toHaveCount(0);

  await page.getByRole("radio", { name: /^Asistente/ }).check();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("No podés cambiar tu propio rol.")).toBeVisible();
});

test("el Master no se elige ni se modifica desde la app", async ({ page }) => {
  const organization = await createTestOrganization();
  await onboardAdmin(page, organization);
  await page.goto("/usuarios/nuevo");
  await expect(page.getByRole("radio", { name: /^Master/ })).toHaveCount(0);

  const credentials = await createUserWithoutEmail(page, {
    name: "Rosa Quiroga",
    roleName: "Administración",
  });
  const memberUrl = page.url().split("?")[0]!;
  await makeMaster(credentials.username);
  await page.goto(memberUrl);
  await expect(page.getByText(/Es el usuario Master de la residencia/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar cambios" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Desactivar/ })).toHaveCount(0);
});

test("Configuración: servicio de emergencias, turnos sin superposición y categorías", async ({
  page,
}) => {
  const organization = await createTestOrganization();
  await onboardAdmin(page, organization);

  await page.goto("/configuracion/residencia");
  await page.getByLabel("Nombre", { exact: true }).fill("Medicardio");
  await page.getByLabel("Teléfono", { exact: true }).fill("0810 555 0000");
  await page.getByLabel("N.º de cliente").fill("C-12345");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Los datos de la residencia quedaron guardados.")).toBeVisible();

  await page.goto("/configuracion/turnos");
  const add = page.locator("section", { hasText: "Agregar turno" });
  await add.getByLabel("Nombre").fill("Refuerzo");
  await add.getByLabel("Empieza").fill("10:00");
  await add.getByLabel("Termina").fill("12:00");
  await add.getByRole("button", { name: "Agregar turno" }).click();
  await expect(add.getByText(/Se superpone con el turno Mañana/)).toBeVisible();

  await page.goto("/configuracion/categorias");
  const addCategory = page.locator("section", { hasText: "Agregar categoría" });
  await addCategory.getByLabel("Nombre").fill("Medicación");
  await addCategory.getByRole("button", { name: "Agregar categoría" }).click();
  await expect(page.getByText("Medicación", { exact: true })).toBeVisible();

  await page.goto("/configuracion");
  await expect(page.getByText("Emergencias: Medicardio")).toBeVisible();
});
