import { History } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { actionLabel, fieldLabel, formatValue } from "@/features/activity/labels";
import type { ActivityItem } from "@/features/activity/queries";
import { formatDateTime } from "@/lib/time/format";

/**
 * Historial de cambios (diseño Actividad, DC-04): quién, qué, cuándo y los
 * valores anteriores y nuevos.
 */
export function ActivityList({ items, timeZone }: { items: ActivityItem[]; timeZone: string }) {
  if (items.length === 0) {
    return (
      <EmptyState icon={History} title="Sin cambios registrados">
        Acá aparece cada cambio, con quién lo hizo y cuándo.
      </EmptyState>
    );
  }
  return (
    <ol className="flex flex-col">
      {items.map((item) => {
        const changes = Object.entries(item.changes ?? {});
        // Solicitud enviada por la familia desde la landing (sin persona de la residencia).
        const fromLanding =
          item.action === "admission_request.created" && item.metadata?.origin === "landing";
        return (
          <li key={item.id} className="flex flex-col gap-1.5 border-b px-5 py-4 last:border-b-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="font-medium">
                {fromLanding
                  ? "Llegó la solicitud por el formulario web"
                  : actionLabel(item.action)}
              </span>
              <time
                dateTime={item.occurredAt.toISOString()}
                className="text-[13px] text-muted-foreground"
              >
                {formatDateTime(item.occurredAt, timeZone)}
              </time>
            </div>
            <span className="text-sm text-muted-foreground">
              {item.actorName ?? (fromLanding ? "Familia (formulario web)" : "Sistema")}
              {typeof item.metadata?.documento === "string" ? ` · ${item.metadata.documento}` : ""}
              {typeof item.metadata?.sustancia === "string" ? ` · ${item.metadata.sustancia}` : ""}
            </span>
            {changes.length > 0 ? (
              <dl className="mt-1 grid gap-1 rounded-lg bg-muted/60 p-3 text-[13px]">
                {changes.map(([field, change]) => (
                  <div key={field} className="grid gap-x-2 sm:grid-cols-[11rem_1fr]">
                    <dt className="font-medium">{fieldLabel(field)}</dt>
                    <dd className="text-muted-foreground">
                      {change.antes === null || change.antes === undefined ? (
                        formatValue(field, change.despues)
                      ) : (
                        <>
                          <span className="line-through">{formatValue(field, change.antes)}</span>
                          {" → "}
                          <span className="text-foreground">
                            {formatValue(field, change.despues)}
                          </span>
                        </>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
