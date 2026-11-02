/*
 * Fechas en la zona horaria de cada sede (E11): en la base todo es UTC
 * (timestamptz); para mostrar y para calcular turnos o vencimientos se
 * pasa a la hora local de la sede. Sin librerías: Intl alcanza.
 */

export interface LocalDateTime {
  year: number;
  /** 1 a 12. */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Fecha y hora local de un instante en una zona horaria. */
export function toLocal(instant: Date, timeZone: string): LocalDateTime {
  const values: Record<string, number> = {};
  for (const part of partsFormatter(timeZone).formatToParts(instant)) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  return {
    year: values.year!,
    month: values.month!,
    day: values.day!,
    hour: values.hour!,
    minute: values.minute!,
    second: values.second!,
  };
}

/** Diferencia con UTC, en minutos, de una zona en un instante (-180 en Argentina). */
export function offsetMinutes(instant: Date, timeZone: string): number {
  const local = toLocal(instant, timeZone);
  const asUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    local.second,
  );
  const truncated = Math.floor(instant.getTime() / 1000) * 1000;
  return Math.round((asUtc - truncated) / 60_000);
}

/** Instante UTC de una fecha y hora local de la zona. */
export function fromLocal(
  local: Omit<LocalDateTime, "second"> & { second?: number },
  timeZone: string,
): Date {
  const guess = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    local.second ?? 0,
  );
  const first = offsetMinutes(new Date(guess), timeZone);
  let result = guess - first * 60_000;
  // Si el cambio de horario cae justo en el medio, la segunda vuelta corrige.
  const second = offsetMinutes(new Date(result), timeZone);
  if (second !== first) result = guess - second * 60_000;
  return new Date(result);
}

/** Fecha local como texto ISO (AAAA-MM-DD). */
export function localDateKey(local: Pick<LocalDateTime, "year" | "month" | "day">): string {
  return `${local.year}-${String(local.month).padStart(2, "0")}-${String(local.day).padStart(2, "0")}`;
}

/** Suma días a una fecha local (sin hora), sin depender de la zona. */
export function addDays(
  date: Pick<LocalDateTime, "year" | "month" | "day">,
  days: number,
): Pick<LocalDateTime, "year" | "month" | "day"> {
  const value = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return { year: value.getUTCFullYear(), month: value.getUTCMonth() + 1, day: value.getUTCDate() };
}

/** "06:00" o "06:00:00" (columna time de PostgreSQL) a minutos desde la medianoche. */
export function parseTimeOfDay(value: string): number {
  const match = /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(value);
  if (!match) throw new Error(`Hora inválida: ${value}`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new Error(`Hora inválida: ${value}`);
  return hours * 60 + minutes;
}

/** "06:00" para mostrar. */
export function formatTimeOfDay(value: string): string {
  const minutes = parseTimeOfDay(value);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** ¿La zona horaria existe? (para validar la configuración de la sede). */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}
