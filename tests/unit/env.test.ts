import { describe, expect, it } from "vitest";

import { parseServerEnv } from "@/lib/env/schema";

describe("parseServerEnv", () => {
  it("usa los valores por defecto de desarrollo", () => {
    expect(parseServerEnv({})).toEqual({
      NODE_ENV: "development",
      APP_URL: "http://localhost:3000",
      LOG_LEVEL: "info",
      SMTP_PORT: 587,
      SMTP_SECURITY: "starttls",
      STORAGE_DIR: "storage",
    });
  });

  it("una variable vacía cuenta como no definida", () => {
    const env = parseServerEnv({ SMTP_HOST: "", BETTER_AUTH_SECRET: "", SMTP_PORT: "" });
    expect(env.SMTP_HOST).toBeUndefined();
    expect(env.BETTER_AUTH_SECRET).toBeUndefined();
    expect(env.SMTP_PORT).toBe(587);
  });

  it("convierte el puerto SMTP y rechaza un modo de seguridad desconocido", () => {
    expect(parseServerEnv({ SMTP_PORT: "465", SMTP_SECURITY: "tls" })).toMatchObject({
      SMTP_PORT: 465,
      SMTP_SECURITY: "tls",
    });
    expect(() => parseServerEnv({ SMTP_SECURITY: "ssl" })).toThrow(/SMTP_SECURITY/);
  });

  it("rechaza una URL inválida y nombra la variable", () => {
    expect(() => parseServerEnv({ APP_URL: "no-es-una-url" })).toThrow(/APP_URL/);
  });

  it("no muestra el valor recibido en el error (podría ser un secreto)", () => {
    expect(() => parseServerEnv({ APP_URL: "valor-secreto" })).not.toThrow(/valor-secreto/);
  });

  it("acepta una URL de PostgreSQL y rechaza otra cosa sin mostrarla", () => {
    const url = "postgres://r360_app:clave@localhost:5432/residencia360";
    expect(parseServerEnv({ DATABASE_URL: url }).DATABASE_URL).toBe(url);
    expect(() => parseServerEnv({ DATABASE_URL: "mysql://clave-secreta@x/db" })).toThrow(
      /DATABASE_URL/,
    );
    expect(() => parseServerEnv({ DATABASE_URL: "mysql://clave-secreta@x/db" })).not.toThrow(
      /clave-secreta/,
    );
  });

  it("exige un secreto de autenticación de al menos 32 caracteres, sin mostrarlo", () => {
    const secret = "s".repeat(32);
    expect(parseServerEnv({ BETTER_AUTH_SECRET: secret }).BETTER_AUTH_SECRET).toBe(secret);
    expect(() => parseServerEnv({ BETTER_AUTH_SECRET: "corto-y-secreto" })).toThrow(
      /BETTER_AUTH_SECRET/,
    );
    expect(() => parseServerEnv({ BETTER_AUTH_SECRET: "corto-y-secreto" })).not.toThrow(
      /corto-y-secreto/,
    );
  });
});
