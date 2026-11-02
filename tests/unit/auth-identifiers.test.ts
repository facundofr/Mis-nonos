import { describe, expect, it } from "vitest";

import {
  canReceiveEmail,
  isValidUsername,
  parseLoginIdentifier,
  safeRedirectPath,
  technicalEmailFor,
} from "@/lib/auth/identifiers";
import { checkNewPassword } from "@/lib/auth/passwords";

describe("parseLoginIdentifier", () => {
  it("reconoce un email y lo pasa a minúsculas", () => {
    expect(parseLoginIdentifier("  Ana.Perez@Ejemplo.com ")).toEqual({
      kind: "email",
      value: "ana.perez@ejemplo.com",
    });
  });

  it("reconoce un usuario y lo normaliza (DC-11)", () => {
    expect(parseLoginIdentifier(" Maria.Gomez ")).toEqual({
      kind: "username",
      value: "maria.gomez",
    });
  });

  it("rechaza lo que no es ni email ni usuario válido", () => {
    expect(parseLoginIdentifier("")).toBeNull();
    expect(parseLoginIdentifier("nombre@")).toBeNull();
    expect(parseLoginIdentifier("ma")).toBeNull();
    expect(parseLoginIdentifier("con espacios")).toBeNull();
  });
});

describe("isValidUsername", () => {
  it("acepta letras, números, punto y guion bajo", () => {
    expect(isValidUsername("maria")).toBe(true);
    expect(isValidUsername("maria.gomez")).toBe(true);
    expect(isValidUsername("cuidador_2")).toBe(true);
  });

  it("rechaza mayúsculas, separadores al borde o seguidos y largos fuera de rango", () => {
    expect(isValidUsername("Maria")).toBe(false);
    expect(isValidUsername(".maria")).toBe(false);
    expect(isValidUsername("maria.")).toBe(false);
    expect(isValidUsername("maria..gomez")).toBe(false);
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("a".repeat(31))).toBe(false);
  });
});

describe("emails técnicos (personal sin email)", () => {
  it("nunca reciben correo", () => {
    expect(technicalEmailFor("maria")).toBe("maria@sin-email.invalid");
    expect(canReceiveEmail(technicalEmailFor("maria"))).toBe(false);
    expect(canReceiveEmail("ana@ejemplo.com")).toBe(true);
  });
});

describe("safeRedirectPath", () => {
  it("acepta rutas internas", () => {
    expect(safeRedirectPath("/inicio")).toBe("/inicio");
    expect(safeRedirectPath("/invitacion/abc?x=1")).toBe("/invitacion/abc?x=1");
  });

  it("descarta otros sitios y trucos de redirección abierta", () => {
    expect(safeRedirectPath("https://otro.sitio")).toBe("/inicio");
    expect(safeRedirectPath("//otro.sitio")).toBe("/inicio");
    expect(safeRedirectPath("/\\otro.sitio")).toBe("/inicio");
    expect(safeRedirectPath("/inicio\nSet-Cookie: x")).toBe("/inicio");
    expect(safeRedirectPath(["/inicio"])).toBe("/inicio");
    expect(safeRedirectPath(undefined, "/ingresar")).toBe("/ingresar");
  });
});

describe("checkNewPassword", () => {
  it("pide al menos 10 caracteres y que la confirmación coincida", () => {
    expect(checkNewPassword("corta", "corta")).toMatch(/al menos 10/);
    expect(checkNewPassword("una frase larga", "otra frase larga")).toMatch(/no coinciden/);
    expect(checkNewPassword("          ", "          ")).toMatch(/espacios/);
    expect(checkNewPassword("una frase larga", "una frase larga")).toBeNull();
  });
});
