import { describe, expect, it } from "vitest";

import { isDuplicate, isInside, nextKind, sameToken } from "@/features/attendance/rules";

// Reglas de la asistencia (docs/decisions/0020).

const at = (iso: string) => new Date(iso);

describe("asistencia: entrada o salida", () => {
  it("sin registros, o después de salir, el próximo es la entrada", () => {
    expect(nextKind(null, at("2026-11-03T10:00:00Z"))).toBe("in");
    expect(
      nextKind({ kind: "out", occurredAt: at("2026-11-03T09:00:00Z") }, at("2026-11-03T10:00:00Z")),
    ).toBe("in");
  });

  it("adentro, el próximo es la salida", () => {
    const last = { kind: "in" as const, occurredAt: at("2026-11-03T06:00:00Z") };
    expect(isInside(last, at("2026-11-03T14:00:00Z"))).toBe(true);
    expect(nextKind(last, at("2026-11-03T14:00:00Z"))).toBe("out");
  });

  it("una entrada sin salida de hace más de 16 h se toma como olvidada", () => {
    const last = { kind: "in" as const, occurredAt: at("2026-11-02T06:00:00Z") };
    expect(isInside(last, at("2026-11-02T22:00:01Z"))).toBe(false);
    expect(nextKind(last, at("2026-11-03T06:00:00Z"))).toBe("in");
  });

  it("el mismo registro dentro de 2 minutos es un doble toque", () => {
    const last = { kind: "in" as const, occurredAt: at("2026-11-03T06:00:00Z") };
    expect(isDuplicate(last, "in", at("2026-11-03T06:01:59Z"))).toBe(true);
    expect(isDuplicate(last, "in", at("2026-11-03T06:02:01Z"))).toBe(false);
    expect(isDuplicate(last, "out", at("2026-11-03T06:01:00Z"))).toBe(false);
  });

  it("compara los códigos completos", () => {
    expect(sameToken("a".repeat(64), "a".repeat(64))).toBe(true);
    expect(sameToken("a".repeat(64), `${"a".repeat(63)}b`)).toBe(false);
    expect(sameToken("a".repeat(64), "a".repeat(63))).toBe(false);
  });
});
