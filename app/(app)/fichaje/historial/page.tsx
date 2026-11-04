import type { Metadata, Route } from "next";
import Link from "next/link";
import { z } from "zod";

import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { formatDuration, monthKey, parseMonth, type Month } from "@/features/attendance/history";
import { requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { formatDateKey, formatLongDate } from "@/lib/time/format";
import { fromLocal } from "@/lib/time/zoned";

import { MonthCalendar, MonthPicker, SessionList, type CalendarDay } from "../history-ui";
import { loadMonthSessions } from "../load-month";

export const metadata: Metadata = { title: "Historial de fichaje" };

const BASE = "/fichaje/historial";

/**
 * Historial de fichaje de la residencia (docs/decisions/0025): calendario
 * del mes con cuántas personas ficharon cada día. Al tocar un día, quién
 * entró y salió y a qué hora; sin día, las horas de cada persona en el mes.
 * Solo Administración (attendance.read).
 */
export default async function AttendanceHistoryPage({
  searchParams,
}: PageProps<"/fichaje/historial">) {
  const context = await requirePermission("attendance.read");
  const params = await searchParams;
  const { site, today } = await getSiteContext(context);
  const now = new Date();
  const current: Month = { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
  const month = parseMonth(params.mes, current);
  const dayParam = z.iso.date().safeParse(params.dia);
  const day =
    dayParam.success && dayParam.data.startsWith(monthKey(month)) && dayParam.data <= today
      ? dayParam.data
      : null;

  const { sessions, byDay } = await loadMonthSessions(context, {
    siteId: site.id,
    timeZone: site.timezone,
    month,
    now,
  });

  const days = new Map<string, CalendarDay>();
  for (const [key, list] of byDay) {
    const people = new Set(list.map((session) => session.userId)).size;
    days.set(key, {
      label: `${people} ${people === 1 ? "persona" : "personas"}`,
      tone: list.some((session) => session.status === "open")
        ? "active"
        : list.some((session) => session.status.startsWith("missing"))
          ? "warning"
          : undefined,
    });
  }

  // Resumen del mes por persona: días y horas.
  const perPerson = new Map<
    string,
    { name: string; days: Set<string>; ms: number; gaps: number }
  >();
  for (const session of sessions) {
    const row = perPerson.get(session.userId) ?? {
      name: session.name,
      days: new Set<string>(),
      ms: 0,
      gaps: 0,
    };
    row.days.add(session.day);
    row.ms += session.durationMs ?? 0;
    if (session.status.startsWith("missing")) row.gaps += 1;
    perPerson.set(session.userId, row);
  }
  const people = [...perPerson.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name, "es"));
  const personHref = (userId: string) =>
    `/fichaje/personal/${userId}?mes=${monthKey(month)}` as Route;
  const daySessions = day ? (byDay.get(day) ?? []) : [];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Historial de fichaje"
        description="Quién entró y salió, con fecha y hora. Tocá un día para ver el detalle o un nombre para ver su historial."
        back={{ href: "/fichaje", label: "Fichaje" }}
      />
      <MonthPicker month={month} basePath={BASE} current={current} />
      <MonthCalendar
        month={month}
        days={days}
        selected={day}
        today={today}
        dayHref={(key) => `${BASE}?mes=${monthKey(month)}&dia=${key}` as Route}
      />

      {day ? (
        <Card aria-labelledby="dia">
          <CardHeader
            id="dia"
            title={capitalize(
              formatLongDate(
                fromLocal(
                  {
                    year: Number(day.slice(0, 4)),
                    month: Number(day.slice(5, 7)),
                    day: Number(day.slice(8)),
                    hour: 12,
                    minute: 0,
                  },
                  site.timezone,
                ),
                site.timezone,
              ),
            )}
            description={formatDateKey(day)}
            action={
              <Link
                href={`${BASE}?mes=${monthKey(month)}` as Route}
                className="text-sm font-medium text-primary-ink underline-offset-4 hover:underline"
              >
                Ver el mes
              </Link>
            }
          />
          <SessionList
            sessions={daySessions}
            timeZone={site.timezone}
            empty="Nadie fichó este día."
            lead={(session) => (
              <Link
                href={personHref(session.userId)}
                className="text-primary-ink underline-offset-4 hover:underline"
              >
                {perPerson.get(session.userId)?.name}
              </Link>
            )}
          />
        </Card>
      ) : (
        <Card aria-labelledby="resumen">
          <CardHeader
            id="resumen"
            title="Horas del mes por persona"
            description="Solo cuentan las estadías con entrada y salida (o en curso)."
          />
          {people.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">Nadie fichó este mes.</p>
          ) : (
            <ul className="divide-y">
              {people.map(([userId, row]) => (
                <li key={userId}>
                  <Link
                    href={personHref(userId)}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/60"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{row.name}</span>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {row.days.size} {row.days.size === 1 ? "día" : "días"}
                    </span>
                    <span className="w-24 text-right text-sm font-semibold tabular-nums">
                      {formatDuration(row.ms)}
                    </span>
                    {row.gaps > 0 ? (
                      <span className="text-xs font-medium text-warning-foreground">
                        {row.gaps} sin cerrar
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase("es-AR") + value.slice(1);
}
