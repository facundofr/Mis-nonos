import { describe, expect, it } from "vitest";

import {
  checkFormToken,
  FORM_TOKEN_FIELD,
  HONEYPOT_FIELD,
  issueFormToken,
  looksAutomated,
} from "@/features/public-intake/guard";
import { publicIntakeSettingsSchema, publicRequestSchema } from "@/features/public-intake/schemas";
import { admissionRequestReceivedEmail } from "@/lib/email/templates";
import { uuidv7 } from "@/lib/ids";

// F1-SOL-03: defensas y validación del formulario público (12.9, 17.8).

const SECRET = "secreto-de-prueba-con-mas-de-32-caracteres";

const valid = {
  firstName: "Rosa",
  lastName: "Medina",
  birthDate: "1940-05-02",
  admissionModality: "private",
  responsibleName: "Carla Medina",
  responsiblePhone: "11 5555 1234",
  consent: "on",
};

describe("sello del formulario", () => {
  const opened = Date.parse("2026-11-02T12:00:00Z");
  const token = issueFormToken(SECRET, opened);

  it("vale entre 3 segundos y 24 horas después de abrir el formulario", () => {
    expect(checkFormToken(token, SECRET, opened + 1_000)).toBe("too_fast");
    expect(checkFormToken(token, SECRET, opened + 60_000)).toBe("ok");
    expect(checkFormToken(token, SECRET, opened + 25 * 3600 * 1000)).toBe("expired");
  });

  it("un sello falso, cambiado o firmado con otra clave no vale", () => {
    expect(checkFormToken("", SECRET, opened)).toBe("invalid");
    expect(checkFormToken("123.abc", SECRET, opened)).toBe("invalid");
    expect(checkFormToken(token.replace(/^\d+/, String(opened - 60_000)), SECRET, opened)).toBe(
      "invalid",
    );
    expect(checkFormToken(token, "otra-clave-de-prueba-con-mas-de-32-caracteres", opened)).toBe(
      "invalid",
    );
  });

  it("el campo trampa completo o un envío instantáneo parecen de un robot", () => {
    const data = (fields: Record<string, string>) => {
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields)) formData.set(key, value);
      return formData;
    };
    const later = opened + 30_000;
    expect(looksAutomated(data({ [FORM_TOKEN_FIELD]: token }), SECRET, later).automated).toBe(
      false,
    );
    expect(
      looksAutomated(
        data({ [FORM_TOKEN_FIELD]: token, [HONEYPOT_FIELD]: "https://spam.test" }),
        SECRET,
        later,
      ),
    ).toEqual({ automated: true, reason: "honeypot" });
    expect(looksAutomated(data({ [FORM_TOKEN_FIELD]: token }), SECRET, opened + 500)).toEqual({
      automated: true,
      reason: "too_fast",
    });
    expect(looksAutomated(data({}), SECRET, later).automated).toBe(true);
    // Una pestaña abierta desde ayer es de una persona: no se descarta.
    expect(
      looksAutomated(data({ [FORM_TOKEN_FIELD]: token }), SECRET, opened + 30 * 3600 * 1000)
        .automated,
    ).toBe(false);
  });
});

describe("validación del formulario público (DC-17)", () => {
  it("pide nombre, apellido, nacimiento, modalidad, responsable, teléfono y consentimiento", () => {
    const result = publicRequestSchema.safeParse({});
    expect(result.success).toBe(false);
    const fields = new Set(result.error?.issues.map((issue) => issue.path.join(".")));
    for (const field of [
      "firstName",
      "lastName",
      "birthDate",
      "admissionModality",
      "responsibleName",
      "responsiblePhone",
      "consent",
    ]) {
      expect(fields).toContain(field);
    }
  });

  it("con lo mínimo alcanza; el consentimiento no se guarda como dato", () => {
    const parsed = publicRequestSchema.parse(valid);
    expect(parsed).toMatchObject({ firstName: "Rosa", nationalId: null, responsibleEmail: null });
    expect(parsed).not.toHaveProperty("consent");
  });

  it("no acepta campos que no son del formulario (notas internas, estado, residencia)", () => {
    const parsed = publicRequestSchema.parse({
      ...valid,
      internalNotes: "x",
      status: "converted",
      organizationId: "00000000-0000-0000-0000-000000000000",
      origin: "staff",
    });
    expect(parsed).not.toHaveProperty("internalNotes");
    expect(parsed).not.toHaveProperty("status");
    expect(parsed).not.toHaveProperty("organizationId");
    expect(parsed).not.toHaveProperty("origin");
  });

  it("límites cortos y fechas razonables", () => {
    expect(publicRequestSchema.safeParse({ ...valid, firstName: "a".repeat(61) }).success).toBe(
      false,
    );
    expect(
      publicRequestSchema.safeParse({ ...valid, familyMessage: "a".repeat(601) }).success,
    ).toBe(false);
    expect(publicRequestSchema.safeParse({ ...valid, birthDate: "2999-01-01" }).success).toBe(
      false,
    );
    expect(
      publicRequestSchema.safeParse({ ...valid, desiredAdmissionDate: "2000-01-01" }).success,
    ).toBe(false);
    expect(publicRequestSchema.safeParse({ ...valid, contact2Name: "Pedro Medina" }).success).toBe(
      false,
    );
  });

  it("la dirección pública: minúsculas, números y guiones; publicar exige dirección", () => {
    expect(
      publicIntakeSettingsSchema.parse({ publicSlug: " Mis-Nonos ", publicIntro: "" }).publicSlug,
    ).toBe("mis-nonos");
    expect(
      publicIntakeSettingsSchema.safeParse({ publicSlug: "mis nonos", publicIntro: "" }).success,
    ).toBe(false);
    expect(
      publicIntakeSettingsSchema.safeParse({ publicSlug: "ab", publicIntro: "" }).success,
    ).toBe(false);
    expect(
      publicIntakeSettingsSchema.safeParse({
        publicIntakeEnabled: "on",
        publicSlug: "",
        publicIntro: "",
      }).success,
    ).toBe(false);
  });
});

describe("acuse a la familia (DC-16)", () => {
  it("es genérico: solo el nombre de la residencia", () => {
    const email = admissionRequestReceivedEmail({ to: "carla@prueba.test", siteName: "Mis Nonos" });
    expect(email.subject).toBe("Recibimos tu solicitud · Mis Nonos");
    expect(email.text).toContain("Recibimos tu solicitud de ingreso en Mis Nonos");
    expect(admissionRequestReceivedEmail({ to: "a@b.test", siteName: "<b>X</b>" }).html).toContain(
      "&lt;b&gt;X&lt;/b&gt;",
    );
  });
});

describe("uuidv7", () => {
  it("tiene versión 7, variante RFC y crece con el tiempo", () => {
    const ms = Date.parse("2026-11-02T12:00:00Z");
    const first = uuidv7(ms);
    const second = uuidv7(ms + 1_000);
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(second > first).toBe(true);
    // Los primeros 48 bits son los milisegundos.
    expect(parseInt(first.replaceAll("-", "").slice(0, 12), 16)).toBe(ms);
  });
});
