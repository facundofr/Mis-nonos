/*
 * Vencimientos del abono (7.3-C4). Fechas sin hora (AAAA-MM-DD), en la
 * zona horaria de la sede. Si el mes no tiene el día de vencimiento (29 a
 * 31), vence el último día del mes.
 */

function parts(date: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`Fecha inválida: ${date}`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function key(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** El vencimiento de ese mes para un día de vencimiento dado. */
export function dueDateIn(year: number, month: number, billingDay: number): string {
  return key(year, month, Math.min(billingDay, daysInMonth(year, month)));
}

/** El vencimiento del mes siguiente. */
export function nextDueDate(dueDate: string, billingDay: number): string {
  const { year, month } = parts(dueDate);
  return month === 12 ? dueDateIn(year + 1, 1, billingDay) : dueDateIn(year, month + 1, billingDay);
}

/** Regla de Mis Nonos: mes adelantado, vence el mismo día del mes siguiente al ingreso. */
export function defaultFirstDueDate(admissionDate: string): string {
  const { day } = parts(admissionDate);
  return nextDueDate(admissionDate, day);
}

export function addDays(date: string, days: number): string {
  const { year, month, day } = parts(date);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return key(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
}

export function dayOf(date: string): number {
  return parts(date).day;
}

/** Período que cubre una cuota: desde su vencimiento hasta el día antes del siguiente. */
export function periodFor(dueDate: string, billingDay: number): { start: string; end: string } {
  return { start: dueDate, end: addDays(nextDueDate(dueDate, billingDay), -1) };
}

/** Vencimientos desde `from` (incluido) hasta `until` (incluido). */
export function dueDatesBetween(from: string, until: string, billingDay: number): string[] {
  const dates: string[] = [];
  for (let date = from; date <= until; date = nextDueDate(date, billingDay)) dates.push(date);
  return dates;
}
