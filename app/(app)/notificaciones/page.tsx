import { Bell } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/form-status";
import { PageHeader } from "@/components/ui/page-header";
import { listNotifications } from "@/features/notifications/service";
import { inTenant } from "@/lib/actions";
import { requireAppContext } from "@/lib/auth/session";
import { getSiteContext } from "@/lib/site/server";
import { formatDateTime } from "@/lib/time/format";
import { cn } from "@/lib/utils";

import { markAllReadAction } from "./actions";
import { PageTip } from "../guia/page-tip";

export const metadata: Metadata = { title: "Notificaciones" };

/** Notificaciones de la persona (diseño MovilNotificaciones, F1-NOT-01). */
export default async function NotificationsPage() {
  const context = await requireAppContext();
  const [{ site }, items] = await Promise.all([
    getSiteContext(context),
    inTenant(context, (tx) => listNotifications(tx, context.user.id)),
  ]);
  const unread = items.some((item) => !item.readAt);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader
        title="Notificaciones"
        actions={
          unread ? (
            <form action={markAllReadAction}>
              <SubmitButton variant="outline" size="md" pendingLabel="Marcando…">
                Marcar leídas
              </SubmitButton>
            </form>
          ) : undefined
        }
      />
      <PageTip context={context} tip="notificaciones" />
      {items.length === 0 ? (
        <div className="rounded-[14px] border bg-card">
          <EmptyState icon={Bell} title="Sin notificaciones">
            Acá aparecen los avisos para vos.
          </EmptyState>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-[14px] border bg-card">
          {items.map((item) => (
            <li key={item.id} className="border-b last:border-b-0">
              <Link
                href={`/notificaciones/${item.id}` as Route}
                className={cn(
                  "flex flex-col gap-1 px-4 py-3.5 hover:bg-muted/60",
                  !item.readAt && "bg-secondary/50",
                )}
              >
                <span className="flex items-center gap-2 font-semibold">
                  {!item.readAt ? (
                    <span
                      className="size-2 shrink-0 rounded-full bg-primary"
                      aria-label="Sin leer"
                    />
                  ) : null}
                  {item.title}
                </span>
                {item.body ? (
                  <span className="text-sm text-muted-foreground">{item.body}</span>
                ) : null}
                <span className="text-[13px] text-muted-foreground">
                  {formatDateTime(item.createdAt, site.timezone)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[13px] leading-snug text-muted-foreground">
        Los avisos no muestran datos de salud: dicen qué pasó y te llevan a la pantalla.
      </p>
    </div>
  );
}
