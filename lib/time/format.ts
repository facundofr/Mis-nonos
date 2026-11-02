/*
 * Fechas para mostrar, en español de Argentina y en la zona horaria de la
 * sede (E11). Por defecto, la de Argentina.
 */

export const DEFAULT_TIME_ZONE = "America/Argentina/Buenos_Aires";

const cache = new Map<string, Intl.DateTimeFormat>();

function formatter(key: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  let value = cache.get(key);
  if (!value) {
    value = new Intl.DateTimeFormat("es-AR", options);
    cache.set(key, value);
  }
  return value;
}

/** "02/11/2026 14:35" */
export function formatDateTime(date: Date, timeZone = DEFAULT_TIME_ZONE): string {
  return formatter(`datetime:${timeZone}`, {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(date)
    .replace(",", "");
}

/** "02/11/2026" */
export function formatDate(date: Date, timeZone = DEFAULT_TIME_ZONE): string {
  return formatter(`date:${timeZone}`, {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** "14:35" */
export function formatTime(date: Date, timeZone = DEFAULT_TIME_ZONE): string {
  return formatter(`time:${timeZone}`, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

/** "domingo 25 de octubre" */
export function formatLongDate(date: Date, timeZone = DEFAULT_TIME_ZONE): string {
  return formatter(`long:${timeZone}`, {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

/** Fecha sin hora guardada como texto AAAA-MM-DD (columna date) → "25/10/2026". */
export function formatDateKey(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

/** "hoy 07:15", "ayer 21:40" o "28/10 09:05", en la zona de la sede. */
export function formatWhen(date: Date, now: Date, timeZone = DEFAULT_TIME_ZONE): string {
  const day = (value: Date) => formatDate(value, timeZone);
  const time = formatTime(date, timeZone);
  if (day(date) === day(now)) return `hoy ${time}`;
  if (day(date) === day(new Date(now.getTime() - 24 * 3600 * 1000))) return `ayer ${time}`;
  return `${day(date).slice(0, 5)} ${time}`;
}
