import { Writable } from "node:stream";

import { describe, expect, it } from "vitest";

import { createLogger } from "@/lib/logger";
import { installConsoleRedaction, redactConsoleArgument } from "@/lib/logger/console";
import { formatSafeError, scrubPath, scrubText, serializeError } from "@/lib/logger/scrub";

// Datos ficticios, con la forma de los que podrían filtrarse.
const EMAIL = "ana.perez@ejemplo.com";
const TOKEN = "Zx9_Kq2-Lm7vPq1Rt5Yw3Ue8Io0Pa4Sd6Fg9Hj2Kl5Mn"; // 43 caracteres base64url

/** Error con la forma que arma Drizzle: el mensaje incluye los parámetros. */
function drizzleError() {
  const cause = Object.assign(
    new Error('duplicate key value violates unique constraint "users_email_unique"'),
    {
      code: "23505",
      constraint: "users_email_unique",
      table: "users",
      severity: "ERROR",
      detail: `Key (email)=(${EMAIL}) already exists.`,
    },
  );
  const error = new Error(
    `Failed query: insert into "users" ("email", "name") values ($1, $2)\nparams: ${EMAIL},Ana Pérez`,
  );
  return Object.assign(error, { query: "insert …", params: [EMAIL, "Ana Pérez"], cause });
}

describe("scrubText", () => {
  it("quita los parámetros de Drizzle, emails y tokens", () => {
    const text = scrubText(`Failed query: select 1\nparams: ${EMAIL},Ana\nfin ${TOKEN}`);
    expect(text).not.toContain(EMAIL);
    expect(text).not.toContain("Ana");
    expect(text).not.toContain(TOKEN);
    expect(text).toContain("Failed query: select 1");
  });

  it("quita el valor de una clave duplicada de PostgreSQL", () => {
    expect(scrubText("Key (national_id)=(30111222) already exists.")).toBe(
      "Key (national_id)=([oculto]) already exists.",
    );
  });

  it("conserva los UUID, que sirven para diagnosticar", () => {
    const id = "0199f0a1-7c3e-7b2a-9d4f-1a2b3c4d5e6f";
    expect(scrubText(`residente ${id}`)).toBe(`residente ${id}`);
  });
});

describe("serializeError", () => {
  it("deja el código y la restricción, sin parámetros ni detail", () => {
    const safe = serializeError(drizzleError());
    const all = JSON.stringify(safe);
    expect(all).not.toContain(EMAIL);
    expect(all).not.toContain("Ana Pérez");
    expect(safe.cause).toMatchObject({ code: "23505", constraint: "users_email_unique" });
    expect(safe.message).toContain("Failed query: insert into");
  });

  it("limpia también el stack, que repite el mensaje", () => {
    const safe = serializeError(drizzleError());
    expect(safe.stack).toBeDefined();
    expect(safe.stack).not.toContain(EMAIL);
  });

  it("acepta valores que no son errores", () => {
    expect(serializeError(`falló con ${EMAIL}`)).toEqual({
      type: "string",
      message: "falló con [email]",
    });
  });

  it("formatSafeError arma un texto legible sin datos", () => {
    const text = formatSafeError(serializeError(drizzleError()));
    expect(text).toContain("code=23505");
    expect(text).not.toContain(EMAIL);
  });
});

describe("scrubPath", () => {
  it("quita la query y el token de las invitaciones", () => {
    expect(scrubPath(`/restablecer?token=${TOKEN}`)).toBe("/restablecer");
    expect(scrubPath(`/invitacion/${TOKEN}`)).toBe("/invitacion/[token]");
    expect(scrubPath("/pacientes/0199f0a1-7c3e-7b2a-9d4f-1a2b3c4d5e6f")).toBe(
      "/pacientes/0199f0a1-7c3e-7b2a-9d4f-1a2b3c4d5e6f",
    );
  });
});

describe("createLogger", () => {
  function capture() {
    const lines: string[] = [];
    const destination = new Writable({
      write(chunk, _encoding, callback) {
        lines.push(String(chunk));
        callback();
      },
    });
    return { lines, logger: createLogger({ service: "pruebas", destination }) };
  }

  it("escribe JSON con el servicio y oculta campos sensibles", () => {
    const { lines, logger } = capture();
    logger.info({ email: EMAIL, user: { password: "clave", phone: "1155554444" } }, "hola");
    const entry = JSON.parse(lines[0]!);
    expect(entry).toMatchObject({ level: "info", service: "pruebas", msg: "hola" });
    expect(entry.email).toBe("[oculto]");
    expect(entry.user.password).toBe("[oculto]");
    expect(entry.user.phone).toBe("[oculto]");
  });

  it("los errores pasan por serializeError", () => {
    const { lines, logger } = capture();
    logger.error({ err: drizzleError() }, "falló");
    expect(lines[0]).not.toContain(EMAIL);
    expect(JSON.parse(lines[0]!).err.cause.code).toBe("23505");
  });
});

describe("Consola en producción", () => {
  it("limpia errores y textos, y deja el resto igual", () => {
    expect(redactConsoleArgument(drizzleError())).not.toContain(EMAIL);
    expect(redactConsoleArgument(`token ${TOKEN}`)).toBe("token [token]");
    expect(redactConsoleArgument(42)).toBe(42);
  });

  it("installConsoleRedaction envuelve los métodos una sola vez", () => {
    const written: unknown[][] = [];
    const fake = {
      error: (...args: unknown[]) => written.push(args),
      warn: (...args: unknown[]) => written.push(args),
      info: (...args: unknown[]) => written.push(args),
      log: (...args: unknown[]) => written.push(args),
    } as unknown as Console;
    installConsoleRedaction(fake);
    installConsoleRedaction(fake);
    fake.error("⨯", drizzleError());
    expect(written).toHaveLength(1);
    expect(String(written[0]![1])).not.toContain(EMAIL);
  });
});
