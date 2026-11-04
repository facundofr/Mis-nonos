import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import {
  formatDuration,
  monthKey,
  monthLabel,
  monthWeeks,
  shiftMonth,
  type AttendanceSession,
  type Month,
  type SessionStatus,
} from "@/features/attendance/history";
import { formatDateKey, formatTime } from "@/lib/time/format";
import { localDateKey, toLocal } from "@/lib/time/zoned";
import { cn } from "@/lib/utils";

/* Piezas del historial de fichaje (docs/decisions/0025). */

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Mes anterior y siguiente, y un selector para ir a cualquier mes. */
export function MonthPicker({
  month,
  basePath,
  current,
}: {
  month: Month;
  basePath: string;
  /** El mes de hoy: no se avanza más allá. */
  current: Month;
}) {
  const href = (value: Month) => `${basePath}?mes=${monthKey(value)}` as Route;
  const next = shiftMonth(month, 1);
  const isLast = monthKey(month) >= monthKey(current);
  const arrow =
    "flex size-10 items-center justify-center rounded-lg border bg-card hover:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={href(shiftMonth(month, -1))} aria-label="Mes anterior" className={arrow}>
        <ChevronLeft aria-hidden="true" className="size-5" />
      </Link>
      <h2 className="min-w-44 text-center text-lg font-semibold first-letter:uppercase">
        {monthLabel(month)}
      </h2>
      <Link
        href={href(isLast ? month : next)}
        aria-label="Mes siguiente"
        aria-disabled={isLast}
        className={arrow}
      >
        <ChevronRight aria-hidden="true" className="size-5" />
      </Link>
      <form method="get" action={basePath} className="flex items-center gap-2 sm:ml-auto">
        <label htmlFor="mes" className="text-sm text-muted-foreground">
          Ir a
        </label>
        <input
          id="mes"
          type="month"
          name="mes"
          defaultValue={monthKey(month)}
          max={monthKey(current)}
          className="h-10 rounded-lg border bg-card px-3 text-[15px]"
        />
        <button type="submit" className={buttonClassName({ size: "md", variant: "outline" })}>
          Ver
        </button>
      </form>
    </div>
  );
}

export interface CalendarDay {
  /** Texto corto dentro del día: "3 personas", "8,5 h". */
  label: string;
  tone?: "active" | "warning";
}

/** Calendario del mes: cada día con un resumen; se toca para ver el detalle. */
export function MonthCalendar({
  month,
  days,
  selected,
  today,
  dayHref,
}: {
  month: Month;
  days: Map<string, CalendarDay>;
  selected: string | null;
  today: string;
  dayHref: (day: string) => Route;
}) {
  return (
    <div className="overflow-hidden rounded-[14px] border bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs font-semibold text-muted-foreground">
        {WEEKDAYS.map((day) => (
          <span key={day} className="py-2">
            {day}
          </span>
        ))}
      </div>
      {monthWeeks(month).map((week, index) => (
        <div key={index} className="grid grid-cols-7 border-b last:border-b-0">
          {week.map((day, position) => {
            if (!day) return <span key={position} className="min-h-16 bg-muted/30 sm:min-h-20" />;
            const info = days.get(day);
            const future = day > today;
            const content = (
              <>
                <span
                  className={cn(
                    "text-sm tabular-nums",
                    day === today && "font-bold text-primary-ink",
                  )}
                >
                  {Number(day.slice(8))}
                </span>
                {info ? (
                  <span
                    className={cn(
                      "mt-auto w-full truncate rounded-md px-1 py-0.5 text-center text-[11px] font-semibold sm:text-xs",
                      info.tone === "warning"
                        ? "bg-warning text-warning-foreground"
                        : info.tone === "active"
                          ? "bg-success text-success-foreground"
                          : "bg-secondary text-secondary-foreground",
                    )}
                  >
                    {info.label}
                  </span>
                ) : null}
              </>
            );
            const cell = cn(
              "flex min-h-16 flex-col items-start gap-1 border-r p-1.5 last:border-r-0 sm:min-h-20 sm:p-2",
              selected === day && "bg-secondary/60 ring-2 ring-primary ring-inset",
            );
            return future ? (
              <span key={day} className={cn(cell, "text-muted-foreground/60")}>
                {content}
              </span>
            ) : (
              <Link
                key={day}
                href={dayHref(day)}
                aria-label={`${formatDateKey(day)}${info ? `: ${info.label}` : ": sin registros"}`}
                aria-current={selected === day ? "date" : undefined}
                className={cn(cell, "hover:bg-muted/60")}
              >
                {content}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const STATUS: Record<SessionStatus, { label: string; tone: BadgeTone }> = {
  closed: { label: "Completo", tone: "neutral" },
  open: { label: "Trabajando", tone: "success" },
  missing_exit: { label: "Sin salida", tone: "warning" },
  missing_entry: { label: "Sin entrada", tone: "warning" },
};

/** Fecha corta de un instante en la zona de la sede: "04/11". */
function shortDate(date: Date, timeZone: string): string {
  return formatDateKey(localDateKey(toLocal(date, timeZone))).slice(0, 5);
}

/**
 * Lista de estadías: entrada, salida y horas. `lead` es lo que va primero en
 * cada fila (el nombre de la persona o el día).
 */
export function SessionList<S extends AttendanceSession>({
  sessions,
  timeZone,
  lead,
  empty,
}: {
  sessions: S[];
  timeZone: string;
  lead: (session: S) => ReactNode;
  empty: string;
}) {
  if (sessions.length === 0) {
    return <p className="px-5 py-4 text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="divide-y">
      {sessions.map((session, index) => {
        const status = STATUS[session.status];
        const crossesDay =
          session.entryAt &&
          session.exitAt &&
          shortDate(session.entryAt, timeZone) !== shortDate(session.exitAt, timeZone);
        return (
          <li
            key={index}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 sm:grid-cols-[minmax(0,1.4fr)_1fr_1fr_1fr_auto] sm:px-5"
          >
            <span className="min-w-0 truncate font-medium">{lead(session)}</span>
            <span className="justify-self-end sm:order-last">
              <Badge tone={status.tone}>{status.label}</Badge>
            </span>
            <span className="text-sm">
              <span className="text-muted-foreground">Entrada </span>
              <span className="font-medium tabular-nums">
                {session.entryAt ? formatTime(session.entryAt, timeZone) : "—"}
              </span>
            </span>
            <span className="text-sm">
              <span className="text-muted-foreground">Salida </span>
              <span className="font-medium tabular-nums">
                {session.exitAt
                  ? `${formatTime(session.exitAt, timeZone)}${crossesDay ? ` (${shortDate(session.exitAt, timeZone)})` : ""}`
                  : "—"}
              </span>
            </span>
            <span className="text-sm tabular-nums sm:text-right">
              {session.durationMs !== null ? formatDuration(session.durationMs) : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
