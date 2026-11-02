import { addDays, fromLocal, localDateKey, parseTimeOfDay, toLocal } from "./zoned";

/*
 * Turno actual a partir del reloj y de los turnos de la sede (F.4): no hay
 * asignación de turnos hasta la fase 5. El turno noche se identifica por
 * la fecha en que empieza.
 */

export interface ShiftDefinition {
  id: string;
  name: string;
  /** Hora local de inicio, "HH:MM[:SS]". */
  startsAt: string;
  endsAt: string;
  position: number;
  active: boolean;
}

export interface ShiftOccurrence<S extends ShiftDefinition = ShiftDefinition> {
  shift: S;
  /** Fecha local en que empieza el turno (AAAA-MM-DD). */
  shiftDate: string;
  startsAt: Date;
  endsAt: Date;
}

function crossesMidnight(shift: ShiftDefinition): boolean {
  return parseTimeOfDay(shift.endsAt) <= parseTimeOfDay(shift.startsAt);
}

function occurrence<S extends ShiftDefinition>(
  shift: S,
  date: { year: number; month: number; day: number },
  timeZone: string,
): ShiftOccurrence<S> {
  const start = parseTimeOfDay(shift.startsAt);
  const end = parseTimeOfDay(shift.endsAt);
  const endDate = crossesMidnight(shift) ? addDays(date, 1) : date;
  return {
    shift,
    shiftDate: localDateKey(date),
    startsAt: fromLocal({ ...date, hour: Math.floor(start / 60), minute: start % 60 }, timeZone),
    endsAt: fromLocal({ ...endDate, hour: Math.floor(end / 60), minute: end % 60 }, timeZone),
  };
}

function sorted<S extends ShiftDefinition>(shifts: readonly S[]): S[] {
  return shifts
    .filter((shift) => shift.active)
    .toSorted((a, b) => a.position - b.position || a.startsAt.localeCompare(b.startsAt));
}

/** El turno en curso, o `null` si a esa hora no hay ninguno configurado. */
export function currentShift<S extends ShiftDefinition>(
  shifts: readonly S[],
  now: Date,
  timeZone: string,
): ShiftOccurrence<S> | null {
  const local = toLocal(now, timeZone);
  const today = { year: local.year, month: local.month, day: local.day };
  for (const shift of sorted(shifts)) {
    for (const date of [today, addDays(today, -1)]) {
      const candidate = occurrence(shift, date, timeZone);
      if (candidate.startsAt <= now && now < candidate.endsAt) return candidate;
    }
  }
  return null;
}

/** El último turno que terminó antes de `now` (para el traspaso). */
export function previousShift<S extends ShiftDefinition>(
  shifts: readonly S[],
  now: Date,
  timeZone: string,
): ShiftOccurrence<S> | null {
  const local = toLocal(now, timeZone);
  const today = { year: local.year, month: local.month, day: local.day };
  let best: ShiftOccurrence<S> | null = null;
  for (const shift of sorted(shifts)) {
    for (const offset of [0, -1, -2]) {
      const candidate = occurrence(shift, addDays(today, offset), timeZone);
      if (candidate.endsAt <= now && (!best || candidate.endsAt > best.endsAt)) best = candidate;
    }
  }
  return best;
}

/** El turno de una fecha local concreta (para el historial de traspasos). */
export function shiftOccurrenceOn<S extends ShiftDefinition>(
  shift: S,
  shiftDate: string,
  timeZone: string,
): ShiftOccurrence<S> {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(shiftDate);
  if (!match) throw new Error(`Fecha inválida: ${shiftDate}`);
  return occurrence(
    shift,
    { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) },
    timeZone,
  );
}

/** "Mañana · 06–14 h" */
export function shiftLabel(shift: Pick<ShiftDefinition, "name" | "startsAt" | "endsAt">): string {
  const hour = (value: string) => String(Math.floor(parseTimeOfDay(value) / 60)).padStart(2, "0");
  return `${shift.name} · ${hour(shift.startsAt)}–${hour(shift.endsAt)} h`;
}
