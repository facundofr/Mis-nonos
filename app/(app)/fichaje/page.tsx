import { CircleCheck, CircleX, MonitorSmartphone, Printer, Radio } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { LiveRefresh } from "@/components/live-refresh";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { attendanceBoard } from "@/features/attendance/queries";
import { isInside } from "@/features/attendance/rules";
import { inTenant } from "@/lib/actions";
import { can, requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { formatTime } from "@/lib/time/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Fichaje" };

function sinceLabel(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 === 0 ? `${hours} h` : `${hours} h ${minutes % 60} min`;
}

/**
 * Fichaje (docs/decisions/0020): quién está trabajando ahora, en tiempo
 * real, con tilde verde o cruz. Solo Administración (attendance.read).
 */
export default async function AttendanceBoardPage() {
  const context = await requirePermission("attendance.read");
  const { site } = await getSiteContext(context);
  const now = new Date();
  const [board, canSettings] = await Promise.all([
    inTenant(context, (tx) => attendanceBoard(tx, site.id, now)),
    can(context, "settings.manage"),
  ]);
  const rows = board
    .map((row) => ({ ...row, inside: isInside(row.last, now) }))
    .sort((a, b) => Number(b.inside) - Number(a.inside) || a.name.localeCompare(b.name, "es"));
  const working = rows.filter((row) => row.inside).length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Fichaje"
        description="Quién está trabajando ahora. Cada persona escanea el QR de la entrada al llegar y al irse."
        actions={
          <>
            <Link
              href={`/pantalla/${site.attendanceToken}` as Route}
              target="_blank"
              className={buttonClassName({ size: "md" })}
            >
              <MonitorSmartphone aria-hidden="true" className="size-4" />
              Mostrar el QR en una pantalla
            </Link>
            {canSettings ? (
              <Link
                href="/configuracion/asistencia"
                className={buttonClassName({ size: "md", variant: "outline" })}
              >
                <Printer aria-hidden="true" className="size-4" />
                Imprimir o cambiar el QR
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-success px-3 py-1.5 text-sm font-semibold text-success-foreground">
          <CircleCheck aria-hidden="true" className="size-4" />
          {working} trabajando
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground">
          <CircleX aria-hidden="true" className="size-4" />
          {rows.length - working} sin fichar
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Radio aria-hidden="true" className="size-4 text-success-foreground" />
          En vivo · <LiveRefresh timeZone={site.timezone} className="font-medium tabular-nums" />
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[14px] border bg-card">
          <EmptyState icon={CircleX} title="Sin personal activo">
            Sumá al personal desde Usuarios y roles.
          </EmptyState>
        </div>
      ) : (
        <ul aria-label="Personal" className="overflow-hidden rounded-[14px] border bg-card">
          {rows.map((row) => (
            <li
              key={row.userId}
              className="flex items-center gap-3 border-b px-4 py-3.5 last:border-b-0 sm:px-5"
            >
              <span
                role="img"
                aria-label={row.inside ? "Está trabajando" : "No está"}
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full",
                  row.inside
                    ? "bg-success text-success-foreground"
                    : "bg-danger-surface text-destructive",
                )}
              >
                {row.inside ? (
                  <CircleCheck aria-hidden="true" className="size-6" />
                ) : (
                  <CircleX aria-hidden="true" className="size-6" />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold">{row.name}</span>
                <span className="truncate text-sm text-muted-foreground">{row.roleName}</span>
              </span>
              <span className="shrink-0 text-right text-sm">
                {row.inside && row.last ? (
                  <>
                    <span className="block font-medium">
                      Entró {formatTime(row.last.occurredAt, site.timezone)}
                    </span>
                    <span className="block text-muted-foreground">
                      {now.getTime() - row.last.occurredAt.getTime() < 60_000
                        ? "recién"
                        : `hace ${sinceLabel(now.getTime() - row.last.occurredAt.getTime())}`}
                    </span>
                  </>
                ) : row.last && row.last.kind === "out" ? (
                  <span className="text-muted-foreground">
                    Salió {formatTime(row.last.occurredAt, site.timezone)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Sin fichar</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
