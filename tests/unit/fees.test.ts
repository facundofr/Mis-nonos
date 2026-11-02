import { describe, expect, it } from "vitest";

import { formatMoney, fromCents, parseMoney, toCents } from "@/features/fees/money";
import {
  defaultFirstDueDate,
  dueDatesBetween,
  nextDueDate,
  periodFor,
} from "@/features/fees/schedule";

describe("Abono: montos", () => {
  it("entiende cómo se escriben los pesos", () => {
    expect(parseMoney("150000")).toBe("150000.00");
    expect(parseMoney("150.000")).toBe("150000.00");
    expect(parseMoney("$ 150.000,50")).toBe("150000.50");
    expect(parseMoney("150000,5")).toBe("150000.50");
    expect(parseMoney("1250.75")).toBe("1250.75");
    expect(parseMoney("0")).toBe("0.00");
    expect(parseMoney("abc")).toBeNull();
    expect(parseMoney("-10")).toBeNull();
    expect(parseMoney("1.2.3")).toBeNull();
  });

  it("cuenta en centavos sin errores de redondeo", () => {
    expect(fromCents(toCents("0.10") + toCents("0.20"))).toBe("0.30");
    expect(formatMoney("150000.5")).toBe("$ 150.000,50");
  });
});

describe("Abono: vencimientos", () => {
  it("ingresa el 14/10: vence el 14/11", () => {
    expect(defaultFirstDueDate("2026-10-14")).toBe("2026-11-14");
  });

  it("si el mes no tiene el día, vence el último día", () => {
    expect(defaultFirstDueDate("2026-01-31")).toBe("2026-02-28");
    expect(nextDueDate("2026-02-28", 31)).toBe("2026-03-31");
    expect(nextDueDate("2028-01-30", 30)).toBe("2028-02-29");
    expect(nextDueDate("2026-12-15", 15)).toBe("2027-01-15");
  });

  it("el período va del vencimiento al día anterior al siguiente", () => {
    expect(periodFor("2026-11-14", 14)).toEqual({ start: "2026-11-14", end: "2026-12-13" });
  });

  it("lista los vencimientos de un rango", () => {
    expect(dueDatesBetween("2026-11-30", "2027-03-01", 30)).toEqual([
      "2026-11-30",
      "2026-12-30",
      "2027-01-30",
      "2027-02-28",
    ]);
  });
});

describe("Abono: email del día", () => {
  it("dice cuántas cuotas vencen, sin nombres ni montos (12.10)", async () => {
    const { feeDueSoonDigestEmail } = await import("@/lib/email/templates");
    const message = feeDueSoonDigestEmail({
      to: "sofia@prueba.test",
      name: "Sofía",
      count: 3,
      days: 7,
      url: "https://app.prueba.test/abonos",
    });
    expect(message.subject).toBe("3 cuotas del abono vencen en los próximos 7 días");
    expect(message.text).toContain("https://app.prueba.test/abonos");
    expect(message.text + message.html).not.toMatch(/\$|\d{3}\.\d{3}/);
  });
});
