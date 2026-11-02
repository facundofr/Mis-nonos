import { ChevronRight, Inbox, Plus } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import {
  countRequests,
  listRequests,
  type RequestView,
} from "@/features/admission-requests/queries";
import { CHANNEL_LABELS, STATUS_LABELS } from "@/features/admission-requests/schemas";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { formatDateKey, formatWhen } from "@/lib/time/format";
import { cn } from "@/lib/utils";

import { PageTip } from "../guia/page-tip";

export const metadata: Metadata = { title: "Solicitudes de ingreso" };

const VIEWS: { key: RequestView; label: string }[] = [
  { key: "abiertas", label: "Abiertas" },
  { key: "convertidas", label: "Convertidas" },
  { key: "descartadas", label: "Descartadas" },
];

const STATUS_TONES = {
  new: "warning",
  contacting: "info",
  waitlisted: "neutral",
  converted: "success",
  discarded: "neutral",
} as const;

/** Bandeja de solicitudes de ingreso (7.3-C3, F1-SOL-01). */
export default async function RequestsPage({ searchParams }: PageProps<"/solicitudes">) {
  const context = await requirePermission("admission_requests.manage");
  const params = await searchParams;
  const view = VIEWS.some((item) => item.key === params.ver)
    ? (params.ver as RequestView)
    : "abiertas";
  const { site } = await getSiteContext(context);
  const { requests, counts } = await inTenant(context, async (tx) => ({
    requests: await listRequests(tx, { siteId: site.id, view }),
    counts: await countRequests(tx, site.id),
  }));
  const now = new Date();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Solicitudes de ingreso"
        description="Familias que pidieron una vacante. Una solicitud no crea un paciente hasta que la convertís en ingreso."
        back={{ href: "/pacientes", label: "Pacientes" }}
        actions={
          <Link href="/solicitudes/nueva" className={buttonClassName({ size: "md" })}>
            <Plus aria-hidden="true" className="size-4" />
            Nueva solicitud
          </Link>
        }
      />
      <PageTip context={context} tip="solicitudes" />
      {params.descartada ? <Notice tone="success">Solicitud descartada.</Notice> : null}

      <nav aria-label="Filtrar solicitudes" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {VIEWS.map((item) => (
          <Link
            key={item.key}
            href={
              (item.key === "abiertas" ? "/solicitudes" : `/solicitudes?ver=${item.key}`) as Route
            }
            aria-current={view === item.key ? "page" : undefined}
            className={cn(
              "flex h-10 shrink-0 items-center rounded-full border bg-card px-4 text-sm font-medium",
              view === item.key &&
                "border-primary bg-secondary font-semibold text-secondary-foreground",
            )}
          >
            {item.label} · {counts[item.key]}
          </Link>
        ))}
      </nav>

      {requests.length === 0 ? (
        <div className="rounded-[14px] border bg-card">
          <EmptyState icon={Inbox} title="Sin solicitudes">
            {view === "abiertas"
              ? "Cuando una familia pida una vacante, cargala con «Nueva solicitud»."
              : "No hay solicitudes en esta lista."}
          </EmptyState>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {requests.map((request) => (
            <li key={request.id}>
              <Link
                href={`/solicitudes/${request.id}` as Route}
                className="flex items-center gap-3 rounded-[14px] border bg-card p-4 hover:bg-muted/60"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      {request.firstName} {request.lastName}
                    </span>
                    <Badge tone={STATUS_TONES[request.status as keyof typeof STATUS_TONES]}>
                      {STATUS_LABELS[request.status as keyof typeof STATUS_LABELS]}
                    </Badge>
                  </span>
                  <span className="truncate text-sm text-muted-foreground">
                    {[
                      `Responsable: ${request.responsibleName}`,
                      request.admissionModality === "pami"
                        ? "PAMI"
                        : request.admissionModality === "private"
                          ? "Privado"
                          : null,
                      request.desiredAdmissionDate
                        ? `Para el ${formatDateKey(request.desiredAdmissionDate)}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    {request.origin === "landing"
                      ? "Formulario web"
                      : (CHANNEL_LABELS[request.contactChannel as keyof typeof CHANNEL_LABELS] ??
                        "Cargada en la app")}{" "}
                    · {formatWhen(request.createdAt, now, site.timezone)}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-5 shrink-0 text-muted-foreground"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
