import { describe, expect, it } from "vitest";

import {
  formatDuration,
  monthRange,
  monthWeeks,
  pairSessions,
  parseMonth,
  sessionDayKey,
  shiftMonth,
  type AttendanceRecord,
} from "@/features/attendance/history";

const TZ = "America/Argentina/Buenos_Aires";
const at = (iso: string) => new Date(`${iso}-03:00`);
const rec = (userId: string, kind: "in" | "out", iso: string): AttendanceRecord => ({
  userId,
  kind,
  occurredAt: at(iso),
});

describe("pairSessions: estadías de entrada y salida", () => {
  const now = at("2026-11-04T12:00:00");

  it("une cada entrada con su salida y calcula las horas", () => {
    const [session] = pairSessions(
      [rec("ana", "in", "2026-11-03T06:02:00"), rec("ana", "out", "2026-11-03T14:05:00")],
      now,
    );
    expect(session?.status).toBe("closed");
    expect(formatDuration(session!.durationMs!)).toBe("8 h 3 min");
  });

  it("una guardia de 24 h que cruza el día cuenta como una sola estadía", () => {
    const sessions = pairSessions(
      [rec("ana", "in", "2026-11-02T08:00:00"), rec("ana", "out", "2026-11-03T08:00:00")],
      now,
    );
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.durationMs).toBe(24 * 3600 * 1000);
    expect(sessionDayKey(sessions[0]!, TZ)).toBe("2026-11-02");
  });

  it("si todavía no salió, está trabajando y suma hasta ahora", () => {
    const [session] = pairSessions([rec("ana", "in", "2026-11-04T06:00:00")], now);
    expect(session?.status).toBe("open");
    expect(session?.durationMs).toBe(6 * 3600 * 1000);
  });

  it("marca las entradas sin salida y las salidas sin entrada, sin sumar horas", () => {
    const sessions = pairSessions(
      [
        rec("ana", "in", "2026-11-01T06:00:00"),
        rec("ana", "in", "2026-11-02T06:00:00"),
        rec("ana", "out", "2026-11-02T14:00:00"),
        rec("ana", "out", "2026-11-02T15:00:00"),
      ],
      now,
    );
    expect(sessions.map((session) => session.status)).toEqual([
      "missing_exit",
      "closed",
      "missing_entry",
    ]);
    expect(sessions[0]?.durationMs).toBeNull();
  });

  it("separa a cada persona", () => {
    const sessions = pairSessions(
      [
        rec("ana", "in", "2026-11-03T06:00:00"),
        rec("luis", "in", "2026-11-03T07:00:00"),
        rec("ana", "out", "2026-11-03T14:00:00"),
        rec("luis", "out", "2026-11-03T15:00:00"),
      ],
      now,
    );
    expect(sessions.map((session) => [session.userId, session.status])).toEqual([
      ["ana", "closed"],
      ["luis", "closed"],
    ]);
  });
});

describe("Calendario del mes", () => {
  it("lee el mes pedido o usa el de respaldo", () => {
    const fallback = { year: 2026, month: 11 };
    expect(parseMonth("2026-02", fallback)).toEqual({ year: 2026, month: 2 });
    expect(parseMonth("2026-13", fallback)).toEqual(fallback);
    expect(parseMonth(undefined, fallback)).toEqual(fallback);
  });

  it("pasa de año al avanzar o retroceder", () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });

  it("las semanas empiezan el lunes", () => {
    // Noviembre de 2026 empieza un domingo.
    const weeks = monthWeeks({ year: 2026, month: 11 });
    expect(weeks[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
  });

  it("el mes va de medianoche a medianoche en la zona de la sede", () => {
    const { from, to } = monthRange({ year: 2026, month: 11 }, TZ);
    expect(from.toISOString()).toBe("2026-11-01T03:00:00.000Z");
    expect(to.toISOString()).toBe("2026-12-01T03:00:00.000Z");
  });
});
