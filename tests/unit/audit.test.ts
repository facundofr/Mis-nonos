import { describe, expect, it } from "vitest";

import { diffChanges, REDACTED } from "@/lib/audit";

describe("diffChanges (DC-04)", () => {
  it("guarda el valor anterior y el nuevo de cada campo que cambió", () => {
    expect(
      diffChanges(
        { name: "Ana", phone: "111", status: "active" },
        { name: "Ana", phone: "222", status: "inactive" },
      ),
    ).toEqual({
      phone: { antes: "111", despues: "222" },
      status: { antes: "active", despues: "inactive" },
    });
  });

  it("devuelve null si no cambió nada", () => {
    expect(diffChanges({ name: "Ana" }, { name: "Ana" })).toBeNull();
  });

  it("en un alta, el valor anterior es nulo", () => {
    expect(diffChanges(null, { name: "Ana" })).toEqual({ name: { antes: null, despues: "Ana" } });
  });

  it("nunca copia contraseñas, tokens ni secretos", () => {
    const changes = diffChanges(
      { password: "vieja", tokenHash: "a" },
      { password: "nueva", tokenHash: "b" },
    );
    expect(changes).toEqual({
      password: { antes: REDACTED, despues: REDACTED },
      tokenHash: { antes: REDACTED, despues: REDACTED },
    });
    expect(JSON.stringify(changes)).not.toMatch(/vieja|nueva/);
  });

  it("ignora las fechas técnicas salvo que se pidan, y compara fechas por valor", () => {
    const before = { updatedAt: new Date("2026-11-01"), birthDate: new Date("1940-05-02") };
    const after = { updatedAt: new Date("2026-11-02"), birthDate: new Date("1940-05-02") };
    expect(diffChanges(before, after)).toBeNull();
    expect(diffChanges(before, after, ["updatedAt"])).toEqual({
      updatedAt: { antes: "2026-11-01T00:00:00.000Z", despues: "2026-11-02T00:00:00.000Z" },
    });
  });

  it("con una lista de campos, compara solo esos", () => {
    expect(diffChanges({ a: 1, b: 1 }, { a: 2, b: 2 }, ["a"])).toEqual({
      a: { antes: 1, despues: 2 },
    });
  });
});
