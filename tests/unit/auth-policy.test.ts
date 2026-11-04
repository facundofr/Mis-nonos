import { describe, expect, it } from "vitest";

import { AUTH_POLICY, capNewSession, evaluateSession, isPrivilegedRole } from "@/lib/auth/policy";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = new Date("2026-11-01T12:00:00.000Z");
const at = (offsetMs: number) => new Date(now.getTime() + offsetMs);

describe("capNewSession (DC-10)", () => {
  it("sin 'Mantener sesión' la sesión dura 12 h, no el día que fija Better Auth", () => {
    const capped = capNewSession({ expiresAt: at(DAY) }, now);
    expect(capped.absoluteExpiresAt).toEqual(at(12 * HOUR));
    expect(capped.expiresAt).toEqual(at(12 * HOUR));
  });

  it("con 'Mantener sesión' deja los 14 días y no fija tope", () => {
    const capped = capNewSession({ expiresAt: at(14 * DAY) }, now);
    expect(capped).toEqual({ expiresAt: at(14 * DAY), absoluteExpiresAt: null });
  });

  it("al renovar una sesión con tope (p. ej. al activar el 2FA) conserva el tope original", () => {
    const originalCap = at(3 * HOUR);
    const capped = capNewSession({ expiresAt: at(14 * DAY), absoluteExpiresAt: originalCap }, now);
    expect(capped).toEqual({ expiresAt: originalCap, absoluteExpiresAt: originalCap });
  });
});

describe("evaluateSession (DC-10)", () => {
  const base = { now, createdAt: at(-1 * HOUR), absoluteExpiresAt: null, lastActiveAt: null };

  it("vence cuando se pasa el tope absoluto", () => {
    expect(
      evaluateSession({ ...base, absoluteExpiresAt: at(-1), roleKey: "asistente" }).status,
    ).toBe("expired");
  });

  it("cierra por inactividad a Master y Administración a las 8 h", () => {
    const idle = { ...base, lastActiveAt: at(-8 * HOUR) };
    expect(evaluateSession({ ...idle, roleKey: "admin" }).status).toBe("inactive");
    expect(evaluateSession({ ...idle, roleKey: "master" }).status).toBe("inactive");
  });

  it("no corta por inactividad a Profesional ni a Asistente", () => {
    const idle = { ...base, lastActiveAt: at(-10 * HOUR) };
    expect(evaluateSession({ ...idle, roleKey: "profesional" }).status).toBe("active");
    expect(evaluateSession({ ...idle, roleKey: "asistente" }).status).toBe("active");
  });

  it("sin actividad anotada mide desde que se abrió la sesión", () => {
    const fresh = { ...base, createdAt: at(-9 * HOUR) };
    expect(evaluateSession({ ...fresh, roleKey: "admin" }).status).toBe("inactive");
  });

  it("anota actividad cada 5 minutos, no en cada pedido", () => {
    const recent = { ...base, lastActiveAt: at(-60 * 1000), roleKey: "admin" };
    expect(evaluateSession(recent)).toEqual({ status: "active", touch: false });
    const older = { ...base, lastActiveAt: at(-6 * 60 * 1000), roleKey: "admin" };
    expect(evaluateSession(older)).toEqual({ status: "active", touch: true });
  });
});

describe("roles", () => {
  it("solo Master y Administración son roles con 2FA obligatoria", () => {
    expect(isPrivilegedRole("admin")).toBe(true);
    expect(isPrivilegedRole("master")).toBe(true);
    expect(isPrivilegedRole("profesional")).toBe(false);
    expect(isPrivilegedRole("asistente")).toBe(false);
  });

  it("los plazos coinciden con lo confirmado", () => {
    expect(AUTH_POLICY.notRememberedSessionSeconds).toBe(12 * 60 * 60);
    expect(AUTH_POLICY.rememberedSessionSeconds).toBe(14 * 24 * 60 * 60);
    expect(AUTH_POLICY.privilegedInactivitySeconds).toBe(8 * 60 * 60);
    expect(AUTH_POLICY.passwordResetSeconds).toBe(30 * 60);
    expect(AUTH_POLICY.invitationSeconds).toBe(72 * 60 * 60);
  });
});
