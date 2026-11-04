import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  formatDuration,
  formatHoursShort,
  monthKey,
  parseMonth,
  type Month,
} from "@/features/attendance/history";
import { getStaffMember, recentRecords } from "@/features/attendance/queries";
import { isInside } from "@/features/attendance/rules";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { formatDateKey, formatTime, formatWhen } from "@/lib/time/format";

import { MonthCalendar, MonthPicker, SessionList, type CalendarDay } from "../../history-ui";
import { loadMonthSessions } from "../../load-month";

export const metadata: Metadata = { title: "Historial de fichaje" };

const WEEKDAY = new Intl.DateTimeFormat("es-AR", { weekday: "short", timeZone: "UTC" });

/** "mar 04/11" para un día AAAA-MM-DD. */
function dayLabel(day: string): string {
  const date = new Date(`${day}T12:00:00Z`);
  return `${WEEKDAY.format(date).replace(".", "")} ${formatDateKey(day).slice(0, 5)}`;
}

/**
 * Historial de fichaje de una persona (docs/decisions/0025): calendario del
 * mes con las horas de cada día, total del mes y cada entrada y salida.
 * Solo Administración (attendance.read).
 */
export default async function PersonAttendancePage({
  params,
  searchParams,
}: PageProps<"/fichaje/personal/[id]">) {
  const context = await requirePermission("attendance.read");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const query = await searchParams;
  const { site, today } = await getSiteContext(context);
  const now = new Date();

  const data = await inTenant(context, async (tx) => ({
    member: await getStaffMember(tx, id),
    last: (await recentRecords(tx, { siteId: site.id, userId: id, limit: 1 }))[0] ?? null,
  }));
  if (!data.member) notFound();
  const { member, last } = data;
  const inside = isInside(last, now);

  const current: Month = { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
  const month = parseMonth(query.mes, current);
  const dayParam = z.iso.date().safeParse(query.dia);
  const day =
    dayParam.success && dayParam.data.startsWith(monthKey(month)) && dayParam.data <= today
      ? dayParam.data
      : null;
  const base = `/fichaje/personal/${id}`;

  const { sessions, byDay } = await loadMonthSessions(context, {
    siteId: site.id,
    timeZone: site.timezone,
    month,
    now,
    userId: id,
  });

  const days = new Map<string, CalendarDay>();
  for (const [key, list] of byDay) {
    const ms = list.reduce((total, session) => total + (session.durationMs ?? 0), 0);
    const gaps = list.some((session) => session.status.startsWith("missing"));
    days.set(key, {
      label: ms > 0 ? formatHoursShort(ms) : "Sin cerrar",
      tone: list.some((session) => session.status === "open")
        ? "active"
        : gaps
          ? "warning"
          : undefined,
    });
  }
  const totalMs = sessions.reduce((total, session) => total + (session.durationMs ?? 0), 0);
  const gaps = sessions.filter((session) => session.status.startsWith("missing")).length;
  const shown = day ? (byDay.get(day) ?? []) : [...sessions].reverse();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={member.name}
        description={`${member.roleName}${member.active ? "" : " · desactivado"}`}
        back={{ href: "/fichaje", label: "Fichaje" }}
        actions={
          <Link
            href={`/fichaje/historial?mes=${monthKey(month)}` as Route}
            className="text-sm font-medium text-primary-ink underline-offset-4 hover:underline"
          >
            Historial de todos
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1 rounded-[14px] border bg-card p-4">
          <span className="text-sm text-muted-foreground">Ahora</span>
          {inside && last ? (
            <span className="flex flex-wrap items-center gap-2">
              <Badge tone="success">Trabajando</Badge>
              <span className="text-sm">
                desde las {formatTime(last.occurredAt, site.timezone)}
              </span>
            </span>
          ) : (
            <span className="flex flex-wrap items-center gap-2">
              <Badge>No está</Badge>
              {last?.kind === "out" ? (
                <span className="text-sm text-muted-foreground">
                  Salió {formatWhen(last.occurredAt, now, site.timezone)}
                </span>
              ) : null}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1 rounded-[14px] border bg-card p-4">
          <span className="text-sm text-muted-foreground">Días con fichaje en el mes</span>
          <span className="text-2xl font-semibold tabular-nums">{byDay.size}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[14px] border bg-card p-4">
          <span className="text-sm text-muted-foreground">Horas del mes</span>
          <span className="text-2xl font-semibold tabular-nums">{formatDuration(totalMs)}</span>
          {gaps > 0 ? (
            <span className="text-xs text-warning-foreground">
              {gaps} {gaps === 1 ? "registro sin cerrar" : "registros sin cerrar"} (no suman horas)
            </span>
          ) : null}
        </div>
      </div>

      <MonthPicker month={month} basePath={base} current={current} />
      <MonthCalendar
        month={month}
        days={days}
        selected={day}
        today={today}
        dayHref={(key) => `${base}?mes=${monthKey(month)}&dia=${key}` as Route}
      />

      <Card aria-labelledby="registros">
        <CardHeader
          id="registros"
          title={day ? dayLabel(day) : "Entradas y salidas del mes"}
          description={day ? undefined : "De la más nueva a la más vieja."}
          action={
            day ? (
              <Link
                href={`${base}?mes=${monthKey(month)}` as Route}
                className="text-sm font-medium text-primary-ink underline-offset-4 hover:underline"
              >
                Ver el mes
              </Link>
            ) : undefined
          }
        />
        <SessionList
          sessions={shown}
          timeZone={site.timezone}
          empty={day ? "No fichó este día." : "No fichó este mes."}
          lead={(session) => dayLabel(session.day)}
        />
      </Card>
    </div>
  );
}
