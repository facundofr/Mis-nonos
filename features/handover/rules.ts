import {
  currentShift,
  previousShift,
  shiftOccurrenceOn,
  type ShiftDefinition,
  type ShiftOccurrence,
} from "@/lib/time/shifts";
import { addDays, localDateKey, toLocal } from "@/lib/time/zoned";

/*
 * Reglas de tiempo del traspaso (F.4, confirmadas el 01/11/2026). Sin
 * asignación de turnos hasta la fase 5: todo sale del reloj y de los
 * turnos de la sede.
 */

const HOUR = 3600 * 1000;
/** Se puede entregar desde 1 h antes del fin del turno… */
export const DELIVERY_OPENS_BEFORE_END_MS = 1 * HOUR;
/** …hasta 2 h después. */
export const DELIVERY_CLOSES_AFTER_END_MS = 2 * HOUR;
/** Si no hay un turno que siga, se puede confirmar hasta 8 h después del fin. */
const CONFIRM_FALLBACK_MS = 8 * HOUR;

export function deliveryWindow(occurrence: Pick<ShiftOccurrence, "endsAt">) {
  return {
    opensAt: new Date(occurrence.endsAt.getTime() - DELIVERY_OPENS_BEFORE_END_MS),
    closesAt: new Date(occurrence.endsAt.getTime() + DELIVERY_CLOSES_AFTER_END_MS),
  };
}

export function canDeliverAt(occurrence: Pick<ShiftOccurrence, "endsAt">, now: Date): boolean {
  const { opensAt, closesAt } = deliveryWindow(occurrence);
  return now >= opensAt && now <= closesAt;
}

/** El turno que empieza cuando termina este (el turno entrante), si hay. */
export function incomingShift<S extends ShiftDefinition>(
  shifts: readonly S[],
  occurrence: Pick<ShiftOccurrence, "endsAt">,
  timeZone: string,
): ShiftOccurrence<S> | null {
  return currentShift(shifts, occurrence.endsAt, timeZone);
}

/**
 * Confirma "cualquier usuario del turno entrante": desde que se entrega
 * hasta que termina el turno siguiente.
 */
export function canConfirmAt<S extends ShiftDefinition>(
  shifts: readonly S[],
  occurrence: Pick<ShiftOccurrence, "endsAt">,
  timeZone: string,
  now: Date,
): boolean {
  const next = incomingShift(shifts, occurrence, timeZone);
  const until = next ? next.endsAt : new Date(occurrence.endsAt.getTime() + CONFIRM_FALLBACK_MS);
  return now >= deliveryWindow(occurrence).opensAt && now < until;
}

/**
 * El traspaso que importa ahora:
 * - en la última hora del turno en curso, el de ese turno (se prepara la entrega);
 * - si no, el del turno que terminó último (lo recibe el turno entrante).
 */
export function focusOccurrence<S extends ShiftDefinition>(
  shifts: readonly S[],
  now: Date,
  timeZone: string,
): ShiftOccurrence<S> | null {
  const current = currentShift(shifts, now, timeZone);
  if (current && now >= deliveryWindow(current).opensAt) return current;
  return previousShift(shifts, now, timeZone) ?? current;
}

/** Turnos de los últimos días que ya empezaron, del más nuevo al más viejo (historial). */
export function recentOccurrences<S extends ShiftDefinition>(
  shifts: readonly S[],
  now: Date,
  timeZone: string,
  days = 7,
): ShiftOccurrence<S>[] {
  const local = toLocal(now, timeZone);
  const today = { year: local.year, month: local.month, day: local.day };
  const result: ShiftOccurrence<S>[] = [];
  for (let offset = 0; offset <= days; offset++) {
    const date = localDateKey(addDays(today, -offset));
    for (const shift of shifts) {
      if (!shift.active) continue;
      const occurrence = shiftOccurrenceOn(shift, date, timeZone);
      if (occurrence.startsAt <= now) result.push(occurrence);
    }
  }
  return result.toSorted((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
}
