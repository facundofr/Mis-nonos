import { addDays, fromLocal, localDateKey, toLocal } from "@/lib/time/zoned";

import { OPEN_ENTRY_MAX_MS, type AttendanceKind } from "./rules";

/*
 * Historial de la asistencia (docs/decisions/0025), sin base de datos: arma
 * las estadías (entrada → salida) a partir de los registros y el calendario
 * del mes.
 */

export interface AttendanceRecord {
  userId: string;
  kind: AttendanceKind;
  occurredAt: Date;
}

export type SessionStatus =
  /** Entró y salió. */
  | "closed"
  /** Entró hace menos de 36 h y todavía no salió: está trabajando. */
  | "open"
  /** Entró y no registró la salida (pasaron más de 36 h o volvió a entrar). */
  | "missing_exit"
  /** Registró una salida sin la entrada. */
  | "missing_entry";

export interface AttendanceSession {
  userId: string;
  entryAt: Date | null;
  exitAt: Date | null;
  status: SessionStatus;
  /** Tiempo trabajado: hasta la salida o, si sigue adentro, hasta ahora. */
  durationMs: number | null;
}

/**
 * Agrupa los registros de cada persona en estadías. Una salida cierra la
 * última entrada si pasaron menos de 36 h (cubre las guardias de 24 h).
 */
export function pairSessions(records: readonly AttendanceRecord[], now: Date): AttendanceSession[] {
  const sorted = [...records].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  const pending = new Map<string, Date>();
  const sessions: AttendanceSession[] = [];
  const missingExit = (userId: string, entryAt: Date): AttendanceSession => ({
    userId,
    entryAt,
    exitAt: null,
    status: "missing_exit",
    durationMs: null,
  });

  for (const record of sorted) {
    const entryAt = pending.get(record.userId);
    if (record.kind === "in") {
      if (entryAt) sessions.push(missingExit(record.userId, entryAt));
      pending.set(record.userId, record.occurredAt);
      continue;
    }
    pending.delete(record.userId);
    if (entryAt && record.occurredAt.getTime() - entryAt.getTime() < OPEN_ENTRY_MAX_MS) {
      sessions.push({
        userId: record.userId,
        entryAt,
        exitAt: record.occurredAt,
        status: "closed",
        durationMs: record.occurredAt.getTime() - entryAt.getTime(),
      });
      continue;
    }
    if (entryAt) sessions.push(missingExit(record.userId, entryAt));
    sessions.push({
      userId: record.userId,
      entryAt: null,
      exitAt: record.occurredAt,
      status: "missing_entry",
      durationMs: null,
    });
  }

  for (const [userId, entryAt] of pending) {
    const open = now.getTime() - entryAt.getTime() < OPEN_ENTRY_MAX_MS;
    sessions.push(
      open
        ? {
            userId,
            entryAt,
            exitAt: null,
            status: "open",
            durationMs: now.getTime() - entryAt.getTime(),
          }
        : missingExit(userId, entryAt),
    );
  }
  return sessions.sort((a, b) => sessionStart(a).getTime() - sessionStart(b).getTime());
}

/** Cuándo empieza la estadía: la entrada o, si falta, la salida. */
export function sessionStart(session: AttendanceSession): Date {
  return (session.entryAt ?? session.exitAt)!;
}

/** Día local (AAAA-MM-DD) al que pertenece la estadía: el de la entrada. */
export function sessionDayKey(session: AttendanceSession, timeZone: string): string {
  return localDateKey(toLocal(sessionStart(session), timeZone));
}

/** "8 h 30 min", "45 min". */
export function formatDuration(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** Horas con un decimal para el calendario: "8,5 h". */
export function formatHoursShort(ms: number): string {
  const hours = Math.round((ms / 3_600_000) * 10) / 10;
  return `${hours.toLocaleString("es-AR")} h`;
}

export interface Month {
  year: number;
  month: number;
}

/** "AAAA-MM" válido, o el mes de respaldo. */
export function parseMonth(value: unknown, fallback: Month): Month {
  const match = typeof value === "string" ? /^(\d{4})-(\d{2})$/.exec(value) : null;
  if (!match) return fallback;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return fallback;
  return { year, month };
}

export function monthKey(month: Month): string {
  return `${month.year}-${String(month.month).padStart(2, "0")}`;
}

export function shiftMonth(month: Month, delta: number): Month {
  const index = month.year * 12 + (month.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** "noviembre de 2026" */
export function monthLabel(month: Month): string {
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(month.year, month.month - 1, 1)));
}

/** Del primer instante del mes al primero del siguiente, en la zona de la sede. */
export function monthRange(month: Month, timeZone: string): { from: Date; to: Date } {
  const next = shiftMonth(month, 1);
  return {
    from: fromLocal({ year: month.year, month: month.month, day: 1, hour: 0, minute: 0 }, timeZone),
    to: fromLocal({ year: next.year, month: next.month, day: 1, hour: 0, minute: 0 }, timeZone),
  };
}

/**
 * Las semanas del mes, de lunes a domingo, con los días como AAAA-MM-DD
 * (null fuera del mes).
 */
export function monthWeeks(month: Month): (string | null)[][] {
  const first = { year: month.year, month: month.month, day: 1 };
  // getUTCDay: 0 = domingo. Se corre para que la semana empiece el lunes.
  const offset = (new Date(Date.UTC(month.year, month.month - 1, 1)).getUTCDay() + 6) % 7;
  const days: (string | null)[] = Array.from({ length: offset }, () => null);
  for (let day = first; day.month === month.month; day = addDays(day, 1)) {
    days.push(localDateKey(day));
  }
  while (days.length % 7 !== 0) days.push(null);
  const weeks: (string | null)[][] = [];
  for (let index = 0; index < days.length; index += 7) weeks.push(days.slice(index, index + 7));
  return weeks;
}
