import { parseTimeOfDay } from "@/lib/time/zoned";

/*
 * Los turnos activos no se superponen: así el turno actual (y el traspaso)
 * nunca es ambiguo. Un turno que cruza la medianoche ocupa dos tramos.
 */

type Range = [number, number];
const DAY = 24 * 60;

function ranges(startsAt: string, endsAt: string): Range[] {
  const start = parseTimeOfDay(startsAt);
  const end = parseTimeOfDay(endsAt);
  return end > start
    ? [[start, end]]
    : [
        [start, DAY],
        [0, end],
      ];
}

export function shiftsOverlap(
  a: { startsAt: string; endsAt: string },
  b: { startsAt: string; endsAt: string },
): boolean {
  return ranges(a.startsAt, a.endsAt).some(([aStart, aEnd]) =>
    ranges(b.startsAt, b.endsAt).some(([bStart, bEnd]) => aStart < bEnd && bStart < aEnd),
  );
}

/** Minutos que dura un turno (el noche cruza la medianoche). */
export function shiftMinutes(startsAt: string, endsAt: string): number {
  return ranges(startsAt, endsAt).reduce((total, [start, end]) => total + end - start, 0);
}
