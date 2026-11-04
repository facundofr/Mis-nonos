import "server-only";

import {
  monthKey,
  monthRange,
  pairSessions,
  sessionDayKey,
  type AttendanceSession,
  type Month,
} from "@/features/attendance/history";
import { recordsBetween } from "@/features/attendance/queries";
import { OPEN_ENTRY_MAX_MS } from "@/features/attendance/rules";
import { inTenant } from "@/lib/actions";
import type { AppContext } from "@/lib/auth/session";

export interface MonthSessions {
  sessions: (AttendanceSession & { day: string; name: string })[];
  /** Estadías por día (AAAA-MM-DD). */
  byDay: Map<string, (AttendanceSession & { day: string; name: string })[]>;
}

/**
 * Las estadías que empiezan en el mes. Se leen 36 h de más a cada lado para
 * no cortar una guardia que cruza el cambio de mes.
 */
export async function loadMonthSessions(
  context: AppContext,
  options: { siteId: string; timeZone: string; month: Month; now: Date; userId?: string },
): Promise<MonthSessions> {
  const { from, to } = monthRange(options.month, options.timeZone);
  const records = await inTenant(context, (tx) =>
    recordsBetween(tx, {
      siteId: options.siteId,
      from: new Date(from.getTime() - OPEN_ENTRY_MAX_MS),
      to: new Date(Math.min(to.getTime() + OPEN_ENTRY_MAX_MS, options.now.getTime() + 60_000)),
      userId: options.userId,
    }),
  );
  const names = new Map(records.map((record) => [record.userId, record.name]));
  const key = monthKey(options.month);
  const sessions = pairSessions(records, options.now)
    .map((session) => ({
      ...session,
      day: sessionDayKey(session, options.timeZone),
      name: names.get(session.userId) ?? "",
    }))
    .filter((session) => session.day.startsWith(key));
  const byDay = new Map<string, MonthSessions["sessions"]>();
  for (const session of sessions) {
    byDay.set(session.day, [...(byDay.get(session.day) ?? []), session]);
  }
  return { sessions, byDay };
}
