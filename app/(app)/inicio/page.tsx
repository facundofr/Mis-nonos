import { ArrowRight, FileWarning, Plus, Siren } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { buttonClassName } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { actionLabel } from "@/features/activity/labels";
import { listRecentActivity } from "@/features/activity/queries";
import { countRequests } from "@/features/admission-requests/queries";
import { feeAlerts } from "@/features/fees/queries";
import { residentsWithMissingDocuments } from "@/features/documents/queries";
import { canDeliverAt } from "@/features/handover/rules";
import { listNotes } from "@/features/notes/queries";
import { fullName } from "@/features/residents/format";
import { SETUP_CATALOGS_KEY, SETUP_HIDDEN_KEY } from "@/features/onboarding/content";
import { getSeenOnboarding } from "@/features/onboarding/server";
import { setupProgress } from "@/features/onboarding/service";
import { countResidents } from "@/features/residents/queries";
import { inTenant } from "@/lib/actions";
import { getPermissions } from "@/lib/auth/authorization";
import { requireAppContext } from "@/lib/auth/session";
import { getSiteContext } from "@/lib/site/server";
import { formatLongDate, formatWhen } from "@/lib/time/format";
import { toLocal } from "@/lib/time/zoned";

import { SetupChecklist } from "../guia/setup-checklist";
import { NoteList } from "../novedades/note-list";

export const metadata: Metadata = { title: "Inicio" };

function greeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

function duration(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  const hours = Math.floor(minutes / 60);
  if (hours === 0) return `${minutes} min`;
  return minutes % 60 === 0 ? `${hours} h` : `${hours} h ${minutes % 60} min`;
}

function Tile({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: string;
  detail?: string;
  href?: Route;
}) {
  const body = (
    <>
      <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
      {detail ? (
        <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
          {detail}
          {href ? <ArrowRight aria-hidden="true" className="size-3.5" /> : null}
        </span>
      ) : null}
    </>
  );
  const className = "flex flex-col gap-1 rounded-[14px] border bg-card p-4";
  return href ? (
    <Link href={href} className={`${className} hover:bg-muted/60`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/**
 * Inicio (diseño Inicio, 7.3-H): para el personal, pendientes, novedades
 * recientes y acceso a Emergencia; Administración y Dirección suman
 * documentos faltantes y actividad reciente.
 */
export default async function HomePage() {
  const context = await requireAppContext();
  const [permissions, { site, current, today }, seen] = await Promise.all([
    getPermissions(context),
    getSiteContext(context),
    getSeenOnboarding(context),
  ]);
  // Onboarding de Administración: lista de puesta en marcha.
  const showSetup = permissions.has("settings.manage") && !seen.has(SETUP_HIDDEN_KEY);
  const setup = showSetup
    ? await inTenant(context, (tx) =>
        setupProgress(tx, context.tenant.organizationId, site, seen, SETUP_CATALOGS_KEY),
      )
    : null;
  const now = new Date();
  const firstName = context.user.name.split(" ")[0] || context.user.name;
  const canRead = permissions.has("residents.read");
  const canAllActivity = permissions.has("audit.read_all");
  const canDocuments = permissions.has("documents.files") || permissions.has("admissions.manage");

  const data = canRead
    ? await inTenant(context, async (tx) => ({
        pending: await listNotes(tx, { siteId: site.id, view: "pendientes", limit: 100 }),
        shiftNotes: current
          ? await listNotes(tx, { siteId: site.id, from: current.startsAt, limit: 100 })
          : [],
        recent: await listNotes(tx, { siteId: site.id, limit: 5 }),
        counts: await countResidents(tx),
        missing: canDocuments ? await residentsWithMissingDocuments(tx) : null,
        activity: canAllActivity ? await listRecentActivity(tx) : [],
        fees: permissions.has("fees.read")
          ? await feeAlerts(tx, site.id, today, site.feeReminderDaysBefore)
          : null,
        requests: permissions.has("admission_requests.manage")
          ? await countRequests(tx, site.id)
          : null,
      }))
    : null;

  const setupCard = setup ? <SetupChecklist progress={setup} /> : null;
  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting(toLocal(now, site.timezone).hour)}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground first-letter:uppercase">
          {formatLongDate(now, site.timezone)} · Esto es lo que necesita tu atención hoy.
        </p>
      </div>
      {permissions.has("notes.create") ? (
        <Link href="/novedades/nueva" className={buttonClassName({ size: "md" })}>
          <Plus aria-hidden="true" className="size-4" />
          Nueva novedad
        </Link>
      ) : null}
    </div>
  );
  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        {setupCard}
        <p className="text-muted-foreground">
          {context.membership.organizationName} · {context.membership.roleName}
        </p>
      </div>
    );
  }

  const { pending, shiftNotes, recent, counts, missing, activity, requests, fees } = data;
  const earlier = current ? pending.filter((note) => note.createdAt < current.startsAt).length : 0;
  const lastNote = shiftNotes[0];
  const handoverTile = !current
    ? { value: "—", detail: "Sin turno en curso" }
    : canDeliverAt(current, now)
      ? { value: "Ahora", detail: "Entregar el turno" }
      : {
          value: `En ${duration(current.endsAt.getTime() - now.getTime())}`,
          detail: "Preparar resumen",
        };

  return (
    <div className="flex flex-col gap-6">
      {header}
      {setupCard}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          label="Pendientes abiertos"
          value={String(pending.length)}
          detail={earlier > 0 ? `${earlier} de turnos anteriores` : "Ver pendientes"}
          href="/novedades?ver=pendientes"
        />
        <Tile
          label="Novedades del turno"
          value={String(shiftNotes.length)}
          detail={
            lastNote
              ? `Última ${formatWhen(lastNote.createdAt, now, site.timezone)}`
              : "Ninguna todavía"
          }
          href="/novedades?ver=todas"
        />
        <Tile
          label="Pacientes activos"
          value={String(counts.active + counts.hospitalized)}
          detail={
            counts.hospitalized > 0
              ? `${counts.hospitalized} internado${counts.hospitalized === 1 ? "" : "s"} fuera`
              : "Ver pacientes"
          }
          href="/pacientes"
        />
        <Tile
          label="Traspaso de turno"
          value={handoverTile.value}
          detail={handoverTile.detail}
          href="/turno"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="seguimientos" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id="seguimientos" className="text-lg font-semibold">
              Requieren seguimiento
            </h2>
            {pending.length > 0 ? (
              <Link
                href="/novedades?ver=pendientes"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Ver todos
              </Link>
            ) : null}
          </div>
          <NoteList
            notes={pending.slice(0, 5)}
            now={now}
            timeZone={site.timezone}
            canResolve={permissions.has("notes.resolve")}
            empty={{ title: "Sin pendientes", body: "No hay seguimientos abiertos." }}
          />
        </section>

        <div className="flex flex-col gap-4">
          {permissions.has("emergency.view") ? (
            <section
              aria-labelledby="emergencia"
              className="flex flex-col gap-3 rounded-[14px] border border-danger-border bg-danger-surface p-5 text-danger-surface-foreground"
            >
              <h2 id="emergencia" className="flex items-center gap-2 text-base font-semibold">
                <Siren aria-hidden="true" className="size-5" />
                Emergencia
              </h2>
              <p className="text-sm leading-relaxed">
                Buscá al paciente y abrí su ficha: contactos, alergias, cobertura y hoja de
                derivación.
              </p>
              <Link
                href="/pacientes"
                className="flex h-11 items-center justify-center rounded-lg bg-destructive text-[15px] font-semibold text-destructive-foreground"
              >
                Abrir ficha de emergencia
              </Link>
            </section>
          ) : null}

          <Card aria-labelledby="recientes">
            <CardHeader id="recientes" title="Novedades recientes" />
            {recent.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted-foreground">Todavía no hay novedades.</p>
            ) : (
              <ul className="divide-y">
                {recent.map((note) => (
                  <li key={note.id}>
                    <Link
                      href={`/novedades/${note.id}` as Route}
                      className="flex flex-col gap-0.5 px-5 py-3 hover:bg-muted/60"
                    >
                      <span className="line-clamp-2 text-[15px]">
                        {note.residentFirstName && note.residentLastName ? (
                          <b>
                            {fullName({
                              firstName: note.residentFirstName,
                              lastName: note.residentLastName,
                            })}
                            :{" "}
                          </b>
                        ) : null}
                        {note.content}
                      </span>
                      <span className="text-[13px] text-muted-foreground">
                        {note.categoryName} · {formatWhen(note.createdAt, now, site.timezone)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {fees && (fees.dueSoon > 0 || fees.overdue > 0) ? (
            <Link
              href="/abonos"
              className="flex items-center justify-between gap-3 rounded-[14px] border bg-card p-5 hover:bg-muted/60"
            >
              <span className="flex flex-col gap-0.5">
                <span className="text-base font-semibold">Abonos</span>
                <span className="text-sm text-muted-foreground">
                  {[
                    fees.dueSoon > 0
                      ? `${fees.dueSoon} vence${fees.dueSoon === 1 ? "" : "n"} en los próximos ${site.feeReminderDaysBefore} días`
                      : null,
                    fees.overdue > 0
                      ? `${fees.overdue} vencida${fees.overdue === 1 ? "" : "s"}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <ArrowRight aria-hidden="true" className="size-5 text-muted-foreground" />
            </Link>
          ) : null}

          {requests && requests.abiertas > 0 ? (
            <Link
              href="/solicitudes"
              className="flex items-center justify-between gap-3 rounded-[14px] border bg-card p-5 hover:bg-muted/60"
            >
              <span className="flex flex-col gap-0.5">
                <span className="text-base font-semibold">Solicitudes de ingreso</span>
                <span className="text-sm text-muted-foreground">
                  {requests.nuevas > 0
                    ? `${requests.nuevas} nueva${requests.nuevas === 1 ? "" : "s"} sin revisar · `
                    : ""}
                  {requests.abiertas} abierta{requests.abiertas === 1 ? "" : "s"}
                </span>
              </span>
              <ArrowRight aria-hidden="true" className="size-5 text-muted-foreground" />
            </Link>
          ) : null}

          {missing && missing.total > 0 ? (
            <Card aria-labelledby="faltantes">
              <CardHeader
                id="faltantes"
                title="Documentos faltantes"
                description={`${missing.total} paciente${missing.total === 1 ? "" : "s"} con el legajo incompleto.`}
              />
              <ul className="divide-y">
                {missing.items.map((item) => (
                  <li key={item.residentId}>
                    <Link
                      href={`/pacientes/${item.residentId}?tab=legajo` as Route}
                      className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/60"
                    >
                      <span className="flex items-center gap-2 text-[15px]">
                        <FileWarning
                          aria-hidden="true"
                          className="size-4 text-warning-foreground"
                        />
                        {fullName(item)}
                      </span>
                      <span className="text-[13px] text-muted-foreground">
                        Faltan {item.missing}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {canAllActivity ? (
            <Card aria-labelledby="actividad">
              <CardHeader id="actividad" title="Actividad reciente" />
              {activity.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted-foreground">Sin actividad todavía.</p>
              ) : (
                <ul className="divide-y">
                  {activity.map((item) => (
                    <li key={item.id} className="flex flex-col gap-0.5 px-5 py-3">
                      <span className="text-[15px]">
                        <b>{item.actorName ?? "Sistema"}</b> ·{" "}
                        {actionLabel(item.action).toLocaleLowerCase("es-AR")}
                        {item.residentId && item.residentName ? (
                          <>
                            {" · "}
                            <Link
                              href={`/pacientes/${item.residentId}` as Route}
                              className="text-primary underline-offset-4 hover:underline"
                            >
                              {item.residentName}
                            </Link>
                          </>
                        ) : null}
                      </span>
                      <span className="text-[13px] text-muted-foreground">
                        {formatWhen(item.occurredAt, now, site.timezone)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
