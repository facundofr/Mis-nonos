import { expect, test } from "@playwright/test";

import { createTestOrganization, onboardAdmin } from "./support/organization";
import {
  createUserWithoutEmail,
  firstLoginWithTemporaryPassword,
  newPhone,
} from "./support/people";
import { admitResident } from "./support/residents";

// Seguimiento del cuidado (docs/decisions/0017): profesionales,
// especialidades y registro de emergencias. Datos ficticios.

test("Administración carga un profesional, un profesional registra una atención y una emergencia", async ({
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
  const residentId = /\/pacientes\/([0-9a-f-]+)/.exec(ficha)?.[1] ?? "";
  const nurseCredentials = await createUserWithoutEmail(page, {
    name: "Jorge Suárez",
    roleName: "Profesional",
  });
  const carerCredentials = await createUserWithoutEmail(page, {
    name: "Marta Gómez",
    roleName: "Asistente",
  });

  // Administración agrega una kinesióloga externa.
  await page.goto("/profesionales");
  await page.getByRole("link", { name: "Agregar" }).click();
  await page.getByRole("button", { name: "Agregar profesional" }).click();
  await expect(page.getByText("Escribí el nombre.")).toBeVisible();
  await page.getByLabel(/^Nombre y apellido/).fill("Lic. Paula Díaz");
  await page.getByLabel(/^Especialidad/).selectOption({ label: "Kinesiología" });
  await page.getByText("No, es externo").click();
  await page.getByLabel("Matrícula").fill("MP 4321");
  await page.getByLabel("Teléfono").fill("11 4444-5555");
  await page.getByRole("button", { name: "Agregar profesional" }).click();
  await expect(page.getByText("Profesional agregado.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Llamar a Lic. Paula Díaz" })).toBeVisible();

  const nurse = await newPhone(browser);
  await firstLoginWithTemporaryPassword(nurse, nurseCredentials);

  // Kinesiología: la última visita todavía no existe.
  await nurse.goto("/especialidades");
  await nurse.getByRole("link", { name: /Kinesiología/ }).click();
  await expect(nurse.getByRole("heading", { name: "Kinesiología" })).toBeVisible();
  await expect(
    nurse.getByText("1 paciente sin atenciones de kinesiología registradas."),
  ).toBeVisible();
  await expect(nurse.getByText("Lic. Paula Díaz")).toBeVisible();

  // Asistente no ve atenciones ni registra emergencias (docs/decisions/0021).
  const assistant = await newPhone(browser);
  await firstLoginWithTemporaryPassword(assistant, carerCredentials);
  const denied = await assistant.goto("/especialidades");
  expect(denied?.url()).toMatch(/sin-permiso/);
  await assistant.goto(`/pacientes/${residentId}/emergencia`);
  await expect(assistant.getByText("Ficha de emergencia", { exact: true })).toBeVisible();
  await expect(assistant.getByRole("link", { name: /Registrar la emergencia/ })).toHaveCount(0);

  // El profesional la registra desde la ficha.
  const carer = nurse;
  await carer.goto(`/pacientes/${residentId}/emergencia`);
  await carer.getByRole("link", { name: /Registrar la emergencia/ }).click();
  await carer.getByLabel(/^¿Qué pasó\?/).fill("Caída en el baño, golpe en la cadera.");
  await carer.getByLabel("¿A quién se llamó?").fill("Servicio de emergencias y la hija");
  await carer.getByText("Hubo traslado", { exact: true }).click();
  await carer.getByLabel("¿Adónde lo trasladaron?").fill("Hospital Central");
  await carer.getByRole("button", { name: "Registrar emergencia" }).click();
  await expect(carer.getByText(/Emergencia registrada/)).toBeVisible();
  await expect(carer.getByText("Sí, a Hospital Central")).toBeVisible();
  await carer.getByLabel(/^¿Cómo terminó\?/).fill("Quedó en observación; vuelve mañana.");
  await carer.getByRole("button", { name: "Cerrar emergencia" }).click();
  await expect(carer.getByText("Emergencia cerrada.")).toBeVisible();
  await carer.goto("/emergencias");
  await expect(carer.getByText("Cerrada", { exact: true })).toBeVisible();

  // El historial del paciente lo muestra (sin el texto clínico).
  await page.goto(`/pacientes/${residentId}?tab=actividad`);
  await expect(page.getByText("Registró una atención")).toBeVisible();
  await expect(page.getByText("Cerró una emergencia")).toBeVisible();
});
