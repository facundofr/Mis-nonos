import { ClipboardPlus, Search, Siren, TriangleAlert, Users } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { countRequests } from "@/features/admission-requests/queries";
import { ageOn, fullName } from "@/features/residents/format";
import {
  countResidents,
  listAdmissionsInProgress,
  listResidents,
  type ResidentView,
} from "@/features/residents/queries";
import { inTenant } from "@/lib/actions";
import { can, requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { cn } from "@/lib/utils";
import { PageTip } from "../guia/page-tip";

export const metadata: Metadata = { title: "Pacientes" };

const VIEWS: { key: ResidentView; label: string }[] = [
  { key: "activos", label: "Activos" },
  { key: "internados", label: "Internados fuera" },
  { key: "egresados", label: "Egresados" },
];

/** Pacientes (diseños MovilPacientes y Residentes): búsqueda por nombre, habitación o DNI. */
export default async function ResidentsPage({ searchParams }: PageProps<"/pacientes">) {
  const context = await requirePermission("residents.read");
  const params = await searchParams;
  const view = VIEWS.some((item) => item.key === params.ver)
    ? (params.ver as ResidentView)
    : "activos";
  const query = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const [{ today, site }, canAdmit, canEmergency, canRequests] = await Promise.all([
    getSiteContext(context),
    can(context, "admissions.manage"),
    can(context, "emergency.view"),
    can(context, "admission_requests.manage"),
  ]);
  const { residents, counts, inProgress, openRequests } = await inTenant(context, async (tx) => ({
    residents: await listResidents(tx, { view, query }),
    counts: await countResidents(tx),
    inProgress: canAdmit ? (await listAdmissionsInProgress(tx)).length : 0,
    openRequests: canRequests ? (await countRequests(tx, site.id)).abiertas : null,
  }));
  const countFor: Record<ResidentView, number> = {
    activos: counts.active + counts.hospitalized,
    internados: counts.hospitalized,
    egresados: counts.discharged,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
          <p className="text-sm text-muted-foreground">{countFor.activos} activos</p>
        </div>
        {canAdmit || openRequests !== null ? (
          <div className="flex flex-wrap gap-2">
            {openRequests !== null ? (
              <Link
                href="/solicitudes"
                className={buttonClassName({ variant: "outline", size: "md" })}
              >
                Solicitudes · {openRequests}
              </Link>
            ) : null}
            {inProgress > 0 ? (
              <Link
                href="/ingresos"
                className={buttonClassName({ variant: "outline", size: "md" })}
              >
                Ingresos en curso · {inProgress}
              </Link>
            ) : null}
            {canAdmit ? (
              <Link href="/ingresos/nuevo" className={buttonClassName({ size: "md" })}>
                <ClipboardPlus aria-hidden="true" className="size-4" />
                Nuevo ingreso
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <PageTip context={context} tip="pacientes" />
      <form role="search" className="relative">
        <label htmlFor="buscar" className="sr-only">
          Buscar paciente
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-3.5 left-3.5 size-5 text-muted-foreground"
        />
        <Input
          id="buscar"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Nombre, habitación o DNI"
          className="pl-11"
        />
        {view !== "activos" ? <input type="hidden" name="ver" value={view} /> : null}
      </form>

      <nav aria-label="Filtro" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {VIEWS.map((item) => {
          const selected = item.key === view;
          const href = item.key === "activos" ? "/pacientes" : `/pacientes?ver=${item.key}`;
          return (
            <Link
              key={item.key}
              href={href as `/pacientes`}
              aria-current={selected ? "page" : undefined}
              className={cn(
                "flex h-10 shrink-0 items-center rounded-full border bg-card px-4 text-sm font-medium",
                selected &&
                  "border-primary-ink bg-secondary font-semibold text-secondary-foreground",
              )}
            >
              {item.label} {countFor[item.key]}
            </Link>
          );
        })}
      </nav>

      {residents.length === 0 ? (
        <div className="rounded-[14px] border bg-card">
          <EmptyState icon={Users} title={query ? "Sin resultados" : "Sin pacientes"}>
            {query
              ? `No hay pacientes que coincidan con “${query}”.`
              : view === "activos"
                ? "Los pacientes aparecen acá cuando se confirma su ingreso."
                : "No hay pacientes en esta lista."}
          </EmptyState>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {residents.map((resident) => {
            const name = fullName(resident);
            const age = ageOn(resident.birthDate, today);
            const details = [
              resident.roomLabel ? `Hab. ${resident.roomLabel}` : null,
              age !== null ? `${age} años` : null,
            ].filter(Boolean);
            return (
              <li
                key={resident.id}
                className="flex items-center gap-2 rounded-[14px] border bg-card pr-3 hover:bg-muted/60"
              >
                <Link
                  href={`/pacientes/${resident.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 p-3.5"
                >
                  <Avatar name={name} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate font-semibold">{name}</span>
                    {details.length > 0 ? (
                      <span className="truncate text-sm text-muted-foreground">
                        {details.join(" · ")}
                      </span>
                    ) : null}
                    {resident.hasAllergies || resident.status === "hospitalized" ? (
                      <span className="flex flex-wrap gap-1.5">
                        {resident.hasAllergies ? (
                          <Badge tone="danger">
                            <TriangleAlert aria-hidden="true" className="size-3.5" />
                            Alergia
                          </Badge>
                        ) : null}
                        {resident.status === "hospitalized" ? (
                          <Badge tone="info">Internado fuera</Badge>
                        ) : null}
                      </span>
                    ) : null}
                  </span>
                </Link>
                {canEmergency ? (
                  <Link
                    href={`/pacientes/${resident.id}/emergencia` as Route}
                    prefetch={false}
                    aria-label={`Emergencia de ${name}`}
                    className="flex size-11 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                  >
                    <Siren aria-hidden="true" className="size-5" />
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
