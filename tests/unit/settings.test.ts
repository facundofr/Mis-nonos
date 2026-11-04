import { describe, expect, it } from "vitest";

import { shiftSchema, siteSettingsSchema } from "@/features/settings/schemas";
import { documentKeyFrom } from "@/features/settings/service";
import { shiftMinutes, shiftsOverlap } from "@/features/settings/shift-rules";
import { createWithoutEmailSchema, inviteSchema } from "@/features/users/schemas";
import { suggestTemporaryPassword } from "@/features/users/temporary-password";

describe("Turnos que se superponen", () => {
  const morning = { startsAt: "06:00", endsAt: "14:00" };
  const night = { startsAt: "22:00", endsAt: "06:00" };

  it("detecta superposiciones, incluido el turno que cruza la medianoche", () => {
    expect(shiftsOverlap(morning, { startsAt: "13:00", endsAt: "15:00" })).toBe(true);
    expect(shiftsOverlap(night, { startsAt: "05:00", endsAt: "07:00" })).toBe(true);
    expect(shiftsOverlap(night, { startsAt: "23:00", endsAt: "23:30" })).toBe(true);
  });

  it("turnos pegados no se superponen", () => {
    expect(shiftsOverlap(morning, { startsAt: "14:00", endsAt: "22:00" })).toBe(false);
    expect(shiftsOverlap(night, morning)).toBe(false);
  });

  it("calcula la duración", () => {
    expect(shiftMinutes("22:00", "06:00")).toBe(8 * 60);
    expect(shiftMinutes("06:00", "14:00")).toBe(8 * 60);
  });

  it("valida el formulario de turno", () => {
    expect(
      shiftSchema.safeParse({ name: "Mañana", startsAt: "06:00", endsAt: "06:00" }).success,
    ).toBe(false);
    expect(shiftSchema.safeParse({ name: "Mañana", startsAt: "6", endsAt: "14:00" }).success).toBe(
      false,
    );
    expect(
      shiftSchema.parse({ name: " Mañana ", startsAt: "06:00", endsAt: "14:00", active: "on" }),
    ).toEqual({
      name: "Mañana",
      startsAt: "06:00",
      endsAt: "14:00",
      active: true,
    });
  });
});

describe("Configuración de la residencia", () => {
  const base = {
    name: "Sede central",
    address: "",
    phone: "",
    timezone: "America/Argentina/Buenos_Aires",
    emergencyServiceName: "Medicardio",
    emergencyServicePhone: "0810 555 0000",
    emergencyServiceAccount: "",
    medicalControlText: "",
    familyProvidesText: "",
  };

  it("convierte vacíos en null y la casilla en booleano", () => {
    expect(siteSettingsSchema.parse(base)).toMatchObject({
      address: null,
      handoverRequiresConfirmation: false,
    });
  });

  it("rechaza zonas horarias desconocidas", () => {
    expect(siteSettingsSchema.safeParse({ ...base, timezone: "Marte/Olympus" }).success).toBe(
      false,
    );
  });

  it("arma claves estables para los documentos nuevos", () => {
    expect(documentKeyFrom("Credencial de obra social")).toBe("credencial_de_obra_social");
    expect(documentKeyFrom("Ácido fólico (receta)")).toBe("acido_folico_receta");
    expect(documentKeyFrom("2.º DNI")).toMatch(/^doc_/);
  });
});

describe("Formularios de usuarios", () => {
  it("normaliza el email y exige un rol válido", () => {
    const parsed = inviteSchema.parse({
      name: "Marta Gómez",
      email: " Marta@Ejemplo.COM ",
      roleKey: "asistente",
      phone: "",
      profession: "",
      licenseNumber: "",
    });
    expect(parsed).toMatchObject({ email: "marta@ejemplo.com", phone: null });
    expect(inviteSchema.safeParse({ ...parsed, roleKey: "superusuario" }).success).toBe(false);
    // Master no se elige desde la app (docs/decisions/0021).
    expect(inviteSchema.safeParse({ ...parsed, roleKey: "master" }).success).toBe(false);
  });

  it("Profesional lleva la profesión escrita a mano", () => {
    const input = {
      name: "Laura Pereyra",
      email: "laura@ejemplo.com",
      roleKey: "profesional",
      phone: "",
      licenseNumber: "",
    };
    const missing = inviteSchema.safeParse({ ...input, profession: " " });
    expect(missing.success).toBe(false);
    expect(missing.error?.issues[0]?.path).toEqual(["profession"]);
    expect(inviteSchema.parse({ ...input, profession: "Kinesióloga" }).profession).toBe(
      "Kinesióloga",
    );
  });

  it("el usuario sin email va en minúsculas y sin caracteres raros", () => {
    const input = {
      name: "Jorge Suárez",
      roleKey: "profesional",
      phone: "",
      profession: "Enfermera",
      licenseNumber: "",
      temporaryPassword: "k7m2-p9qx-4rtz",
    };
    expect(createWithoutEmailSchema.parse({ ...input, username: "Jorge.Suarez" }).username).toBe(
      "jorge.suarez",
    );
    expect(createWithoutEmailSchema.safeParse({ ...input, username: "jorge suárez" }).success).toBe(
      false,
    );
  });

  it("sugiere contraseñas provisorias fáciles de dictar y distintas", () => {
    const password = suggestTemporaryPassword();
    expect(password).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
    expect(password).not.toMatch(/[01ilo]/);
    expect(suggestTemporaryPassword()).not.toBe(password);
  });
});
