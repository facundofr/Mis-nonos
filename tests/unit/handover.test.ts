import { describe, expect, it } from "vitest";

import {
  canConfirmAt,
  canDeliverAt,
  focusOccurrence,
  incomingShift,
  recentOccurrences,
} from "@/features/handover/rules";
import { shiftOccurrenceOn } from "@/lib/time/shifts";

const TZ = "America/Argentina/Buenos_Aires"; // UTC-3
const shift = (id: string, name: string, startsAt: string, endsAt: string, position: number) => ({
  id,
  name,
  startsAt,
  endsAt,
  position,
  active: true,
});
const SHIFTS = [
  shift("m", "Mañana", "06:00", "14:00", 1),
  shift("t", "Tarde", "14:00", "22:00", 2),
  shift("n", "Noche", "22:00", "06:00", 3),
];
/** Hora local de Buenos Aires → instante. */
const at = (local: string) => new Date(`${local}-03:00`);

describe("Traspaso: qué turno se muestra", () => {
  it("en la última hora del turno, el turno en curso (se prepara la entrega)", () => {
    const focus = focusOccurrence(SHIFTS, at("2026-11-02T13:15:00"), TZ);
    expect([focus?.shift.name, focus?.shiftDate]).toEqual(["Mañana", "2026-11-02"]);
  });

  it("al empezar el turno, el que terminó (lo recibe el entrante)", () => {
    const focus = focusOccurrence(SHIFTS, at("2026-11-02T14:30:00"), TZ);
    expect([focus?.shift.name, focus?.shiftDate]).toEqual(["Mañana", "2026-11-02"]);
    const later = focusOccurrence(SHIFTS, at("2026-11-02T18:00:00"), TZ);
    expect(later?.shift.name).toBe("Mañana");
  });

  it("el turno noche se identifica por la fecha en que empieza", () => {
    const focus = focusOccurrence(SHIFTS, at("2026-11-03T07:00:00"), TZ);
    expect([focus?.shift.name, focus?.shiftDate]).toEqual(["Noche", "2026-11-02"]);
    expect(incomingShift(SHIFTS, focus!, TZ)?.shift.name).toBe("Mañana");
  });
});

describe("Traspaso: ventanas", () => {
  const morning = shiftOccurrenceOn(SHIFTS[0]!, "2026-11-02", TZ);

  it("se entrega desde 1 h antes hasta 2 h después del fin", () => {
    expect(canDeliverAt(morning, at("2026-11-02T12:59:00"))).toBe(false);
    expect(canDeliverAt(morning, at("2026-11-02T13:00:00"))).toBe(true);
    expect(canDeliverAt(morning, at("2026-11-02T16:00:00"))).toBe(true);
    expect(canDeliverAt(morning, at("2026-11-02T16:01:00"))).toBe(false);
  });

  it("se confirma hasta que termina el turno entrante", () => {
    expect(canConfirmAt(SHIFTS, morning, TZ, at("2026-11-02T21:59:00"))).toBe(true);
    expect(canConfirmAt(SHIFTS, morning, TZ, at("2026-11-02T22:00:00"))).toBe(false);
  });

  it("sin turno que siga, se confirma hasta 8 h después", () => {
    const only = [SHIFTS[0]!];
    expect(canConfirmAt(only, morning, TZ, at("2026-11-02T21:59:00"))).toBe(true);
    expect(canConfirmAt(only, morning, TZ, at("2026-11-02T22:00:00"))).toBe(false);
  });
});

describe("Traspaso: historial", () => {
  it("lista los turnos que ya empezaron, del más nuevo al más viejo", () => {
    const list = recentOccurrences(SHIFTS, at("2026-11-02T15:00:00"), TZ, 1);
    expect(list.map((item) => `${item.shiftDate} ${item.shift.name}`)).toEqual([
      "2026-11-02 Tarde",
      "2026-11-02 Mañana",
      "2026-11-01 Noche",
      "2026-11-01 Tarde",
      "2026-11-01 Mañana",
    ]);
  });
});
