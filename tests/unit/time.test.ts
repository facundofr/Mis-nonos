import { describe, expect, it } from "vitest";

import { currentShift, previousShift, shiftLabel, shiftOccurrenceOn } from "@/lib/time/shifts";
import {
  addDays,
  formatTimeOfDay,
  fromLocal,
  isValidTimeZone,
  offsetMinutes,
  parseTimeOfDay,
  toLocal,
} from "@/lib/time/zoned";

const AR = "America/Argentina/Buenos_Aires";
const MADRID = "Europe/Madrid";

const SHIFTS = [
  { id: "m", name: "Mañana", startsAt: "06:00:00", endsAt: "14:00:00", position: 1, active: true },
  { id: "t", name: "Tarde", startsAt: "14:00:00", endsAt: "22:00:00", position: 2, active: true },
  { id: "n", name: "Noche", startsAt: "22:00:00", endsAt: "06:00:00", position: 3, active: true },
];

describe("Zona horaria", () => {
  it("Argentina es UTC-3", () => {
    const instant = new Date("2026-11-01T12:00:00Z");
    expect(offsetMinutes(instant, AR)).toBe(-180);
    expect(toLocal(instant, AR)).toMatchObject({ year: 2026, month: 11, day: 1, hour: 9 });
  });

  it("de hora local a UTC y de vuelta", () => {
    const instant = fromLocal({ year: 2026, month: 11, day: 1, hour: 6, minute: 0 }, AR);
    expect(instant.toISOString()).toBe("2026-11-01T09:00:00.000Z");
  });

  it("respeta el cambio de horario de otras zonas (E11)", () => {
    // En Madrid el 29/03/2026 se pasa de UTC+1 a UTC+2.
    expect(
      fromLocal({ year: 2026, month: 3, day: 28, hour: 12, minute: 0 }, MADRID).toISOString(),
    ).toBe("2026-03-28T11:00:00.000Z");
    expect(
      fromLocal({ year: 2026, month: 3, day: 30, hour: 12, minute: 0 }, MADRID).toISOString(),
    ).toBe("2026-03-30T10:00:00.000Z");
  });

  it("suma días cruzando meses y años", () => {
    expect(addDays({ year: 2026, month: 12, day: 31 }, 1)).toEqual({
      year: 2027,
      month: 1,
      day: 1,
    });
    expect(addDays({ year: 2026, month: 3, day: 1 }, -1)).toEqual({
      year: 2026,
      month: 2,
      day: 28,
    });
  });

  it("lee las horas de PostgreSQL y rechaza las inválidas", () => {
    expect(parseTimeOfDay("06:00:00")).toBe(360);
    expect(parseTimeOfDay("22:30")).toBe(1350);
    expect(formatTimeOfDay("06:00:00")).toBe("06:00");
    expect(() => parseTimeOfDay("25:00")).toThrow();
    expect(() => parseTimeOfDay("6")).toThrow();
  });

  it("valida zonas horarias", () => {
    expect(isValidTimeZone(AR)).toBe(true);
    expect(isValidTimeZone("Marte/Olympus")).toBe(false);
  });
});

describe("Turno actual (F.4)", () => {
  const at = (iso: string) => new Date(iso);

  it("a las 09:00 es el turno mañana del mismo día", () => {
    const shift = currentShift(SHIFTS, at("2026-11-01T12:00:00Z"), AR);
    expect(shift?.shift.name).toBe("Mañana");
    expect(shift?.shiftDate).toBe("2026-11-01");
    expect(shift?.startsAt.toISOString()).toBe("2026-11-01T09:00:00.000Z");
    expect(shift?.endsAt.toISOString()).toBe("2026-11-01T17:00:00.000Z");
  });

  it("el turno noche se identifica por la fecha en que empieza", () => {
    // 02:00 del 02/11 en Argentina: es la noche del 01/11.
    const shift = currentShift(SHIFTS, at("2026-11-02T05:00:00Z"), AR);
    expect(shift?.shift.name).toBe("Noche");
    expect(shift?.shiftDate).toBe("2026-11-01");
    expect(shift?.endsAt.toISOString()).toBe("2026-11-02T09:00:00.000Z");
    // 23:00 del 01/11: también es la noche del 01/11.
    expect(currentShift(SHIFTS, at("2026-11-02T02:00:00Z"), AR)?.shiftDate).toBe("2026-11-01");
  });

  it("el inicio pertenece al turno que empieza y el fin al siguiente", () => {
    expect(currentShift(SHIFTS, at("2026-11-01T17:00:00Z"), AR)?.shift.name).toBe("Tarde");
  });

  it("sin turno a esa hora, o con el turno desactivado, devuelve null", () => {
    const onlyMorning = SHIFTS.map((shift) => ({ ...shift, active: shift.id === "m" }));
    expect(currentShift(onlyMorning, at("2026-11-01T23:00:00Z"), AR)).toBeNull();
  });

  it("el turno anterior es el último que terminó", () => {
    // 15:00: terminó la mañana de hoy.
    expect(previousShift(SHIFTS, at("2026-11-01T18:00:00Z"), AR)).toMatchObject({
      shift: { name: "Mañana" },
      shiftDate: "2026-11-01",
    });
    // 07:00 del 02/11: terminó la noche del 01/11.
    expect(previousShift(SHIFTS, at("2026-11-02T10:00:00Z"), AR)).toMatchObject({
      shift: { name: "Noche" },
      shiftDate: "2026-11-01",
    });
  });

  it("arma el turno de una fecha y su etiqueta", () => {
    const night = shiftOccurrenceOn(SHIFTS[2]!, "2026-12-31", AR);
    expect(night.endsAt.toISOString()).toBe("2027-01-01T09:00:00.000Z");
    expect(shiftLabel(SHIFTS[0]!)).toBe("Mañana · 06–14 h");
  });
});
