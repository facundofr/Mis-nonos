import type { Metadata, Route } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { listHandoversSince } from "@/features/handover/queries";
import { canDeliverAt, recentOccurrences } from "@/features/handover/rules";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { formatDateKey, formatTime } from "@/lib/time/format";
import { shiftLabel } from "@/lib/time/shifts";

export const metadata: Metadata = { title: "Historial de traspasos" };

const DAYS = 7;

/** Historial de traspasos (F.6): última semana, con entregados y "sin entrega". */
export default async function HandoverHistoryPage() {
  const context = await requirePermission("residents.read");
  const { site, shifts } = await getSiteContext(context);
  const now = new Date();
  const occurrences = recentOccurrences(shifts, now, site.timezone, DAYS);
  const oldest = occurrences.at(-1)?.shiftDate;
  const delivered = oldest
    ? await inTenant(context, (tx) => listHandoversSince(tx, site.id, oldest))
    : [];
  const byKey = new Map(delivered.map((row) => [`${row.shiftId}:${row.shiftDate}`, row]));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <PageHeader
        title="Historial de traspasos"
        description={`Últimos ${DAYS} días`}
        back={{ href: "/turno", label: "Traspaso de turno" }}
      />
      <ul className="flex flex-col gap-2">
        {occurrences.map((occurrence) => {
          const row = byKey.get(`${occurrence.shift.id}:${occurrence.shiftDate}`);
          const running = occurrence.endsAt > now || canDeliverAt(occurrence, now);
          return (
            <li key={`${occurrence.shift.id}:${occurrence.shiftDate}`}>
              <Link
                href={`/turno?turno=${occurrence.shift.id}&fecha=${occurrence.shiftDate}` as Route}
                className="flex items-center justify-between gap-3 rounded-[14px] border bg-card p-3.5 hover:bg-muted/60"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold">
                    {formatDateKey(occurrence.shiftDate)} · {shiftLabel(occurrence.shift)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {row
                      ? `${row.deliveredByName} · ${formatTime(row.deliveredAt, site.timezone)}`
                      : running
                        ? "En curso"
                        : "Nadie entregó este turno"}
                  </span>
                </span>
                {row ? (
                  <Badge tone={row.confirmedAt ? "primary" : "success"}>
                    {row.confirmedAt ? "Confirmado" : "Entregado"}
                  </Badge>
                ) : running ? (
                  <Badge tone="neutral">En curso</Badge>
                ) : (
                  <Badge tone="warning">Sin entrega</Badge>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
