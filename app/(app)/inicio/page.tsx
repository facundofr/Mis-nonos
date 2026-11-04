import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileWarning,
  ListChecks,
  NotebookPen,
  Plus,
  Siren,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonClassName } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { actionLabel } from "@/features/activity/labels";
import { listRecentActivity } from "@/features/activity/queries";
import { countRequests } from "@/features/admission-requests/queries";
import { presentNow } from "@/features/attendance/queries";
import { listEmergencies, upcomingControls } from "@/features/care/queries";
import { feeAlerts } from "@/features/fees/queries";
import { residentsWithMissingDocuments } from "@/features/documents/queries";
import { canDeliverAt } from "@/features/handover/rules";
import { listNotes } from "@/features/notes/queries";
import { fullName } from "@/features/residents/format";
import { SETUP_CATALOGS_KEY, SETUP_HIDDEN_KEY } from "@/features/onboarding/content";
import { getSeenOnboarding } from "@/features/onboarding/server";
import { setupProgress } from "@/features/onboarding/service";
import { countResidents } from "@/features/residents/queries";
import { listMembers } from "@/features/users/queries";
import { inTenant } from "@/lib/actions";
import { getPermissions } from "@/lib/auth/authorization";
import { requireAppContext } from "@/lib/auth/session";
import { getSiteContext } from "@/lib/site/server";
import { formatLongDate, formatWhen } from "@/lib/time/format";
import { shiftLabel } from "@/lib/time/shifts";
import { toLocal } from "@/lib/time/zoned";

import { SetupChecklist } from "../guia/setup-checklist";

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

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Tarjeta de indicador (KPI): ícono, número y un enlace corto. */
function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
  href,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  href: Route;
  tone?: "default" | "attention";
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-[14px] border bg-card p-4 transition-colors hover:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none sm:p-5"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        <span
          className={
            tone === "attention"
              ? "flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-warning text-warning-foreground"
              : "flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-secondary text-secondary-foreground"
          }
        >
          <Icon aria-hidden="true" className="size-[18px]" />
        </span>
      </span>
      <span className="text-[28px] leading-none font-semibold tracking-tight tabular-nums">
        {value}
      </span>
      <span className="flex items-center gap-1 text-[13px] text-muted-foreground group-hover:text-primary-ink">
        {detail}
        <ArrowRight aria-hidden="true" className="size-3.5" />
      </span>
    </Link>
  );
}

interface TaskItem {
  key: string;
  href: Route;
  title: ReactNode;
  meta: string;
  urgent?: boolean;
}

/** Una franja de "Tareas del turno": título, cantidad y la lista (o "nada por ahora"). */
function TaskBand({ title, hint, items }: { title: string; hint: string; items: TaskItem[] }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 bg-muted/50 px-5 py-2.5">
        <span className="flex items-baseline gap-2">
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-xs text-muted-foreground">{hint}</span>
        </span>
        <span className="min-w-6 rounded-full bg-card px-2 py-0.5 text-center text-xs font-semibold tabular-nums ring-1 ring-border">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-3.5 text-sm text-muted-foreground">Nada por ahora.</p>
      ) : (
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className="flex items-start gap-3 px-5 py-3 hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
              >
                <span
                  aria-hidden="true"
                  className={
                    item.urgent
                      ? "mt-1.5 size-2 shrink-0 rounded-full bg-destructive"
                      : "mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                  }
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="line-clamp-2 text-[15px]">{item.title}</span>
                  <span className="text-[13px] text-muted-foreground">{item.meta}</span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Tarjeta de enlace con título y resumen (abonos, solicitudes). */
function SummaryLink({ href, title, text }: { href: Route; title: string; text: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-[14px] border bg-card p-5 hover:bg-muted/60"
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-base font-semibold">{title}</span>
        <span className="text-sm text-muted-foreground">{text}</span>
      </span>
      <ArrowRight aria-hidden="true" className="size-5 text-muted-foreground" />
    </Link>
  );
}

/**
 * Inicio (7.3-H), con la estructura de un CRM de residencias: saludo con el
 * turno, indicadores, las tareas del turno por urgencia y la agenda de
 * controles. Administración y Dirección suman abonos, solicitudes,
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
  const canCare = permissions.has("care.read");
  const canStaff = permissions.has("staff.read");
  // Asistente no hace el traspaso: sin enlaces a /turno (docs/decisions/0021).
  const canHandover = permissions.has("handover.deliver") || permissions.has("handover.confirm");

  const data = canRead
    ? await inTenant(context, async (tx) => ({
        pending: await listNotes(tx, { siteId: site.id, view: "pendientes", limit: 100 }),
        shiftNotes: current
          ? await listNotes(tx, { siteId: site.id, from: current.startsAt, limit: 100 })
          : [],
        recent: await listNotes(tx, { siteId: site.id, limit: 5 }),
        counts: await countResidents(tx),
        emergencies: permissions.has("emergencies.manage")
          ? (await listEmergencies(tx, { siteId: site.id, limit: 10 })).filter(
              (item) => item.status === "open",
            )
          : [],
        controls: canCare ? await upcomingControls(tx, { siteId: site.id, today }) : null,
        staffActive: canStaff
          ? (await listMembers(tx)).filter((member) => member.status === "active").length
          : null,
        present: permissions.has("attendance.read") ? await presentNow(tx, site.id, now) : null,
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
  // Sin servicio de emergencias, la ficha de emergencia no tiene botón rojo:
  // Administración y Dirección lo ven acá hasta que se cargue (si está la
  // lista de puesta en marcha, ya lo muestra ella).
  const missingEmergencyService =
    !site.emergencyServicePhone &&
    !setup &&
    (permissions.has("settings.manage") || permissions.has("audit.read_all"));
  const emergencyServiceNotice = missingEmergencyService ? (
    <Notice tone="warning">
      <p className="font-semibold">Falta cargar el servicio de emergencias.</p>
      <p>
        Sin él, las fichas de emergencia no tienen el botón para llamar a la ambulancia.{" "}
        {permissions.has("settings.manage") ? (
          <Link
            href={"/configuracion/residencia" as Route}
            className="font-medium underline underline-offset-4"
          >
            Cargarlo ahora
          </Link>
        ) : (
          "Pedíselo a la administración."
        )}
      </p>
    </Notice>
  ) : null;

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight">
          {greeting(toLocal(now, site.timezone).hour)}, {firstName}
        </h1>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          {current ? (
            <span className="font-medium text-primary-ink">
              Turno {shiftLabel(current.shift).toLocaleLowerCase("es-AR")}
            </span>
          ) : null}
          {current ? <span aria-hidden="true">·</span> : null}
          <span className="first-letter:uppercase">{formatLongDate(now, site.timezone)}</span>
        </p>
      </div>
      {canRead ? (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {permissions.has("notes.create") ? (
            <Link href="/novedades/nueva" className={buttonClassName({ size: "md" })}>
              <Plus aria-hidden="true" className="size-4" />
              Nueva novedad
            </Link>
          ) : null}
          <Link
            href="/novedades?ver=pendientes"
            className={buttonClassName({ size: "md", variant: "outline" })}
          >
            <ListChecks aria-hidden="true" className="size-4" />
            Ver pendientes
          </Link>
        </div>
      ) : null}
    </div>
  );

  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        {emergencyServiceNotice}
        {setupCard}
        <p className="text-muted-foreground">
          {context.membership.organizationName} · {context.membership.roleName}
        </p>
      </div>
    );
  }

  const {
    pending,
    shiftNotes,
    recent,
    counts,
    emergencies,
    controls,
    staffActive,
    present,
    missing,
    activity,
    requests,
    fees,
  } = data;
  const earlier = current ? pending.filter((note) => note.createdAt < current.startsAt) : pending;
  const thisShift = current ? pending.filter((note) => note.createdAt >= current.startsAt) : [];
  const lastNote = shiftNotes[0];

  const noteTask = (note: (typeof pending)[number]): TaskItem => ({
    key: note.id,
    href: `/novedades/${note.id}` as Route,
    title: (
      <>
        {note.residentFirstName && note.residentLastName ? (
          <b className="font-semibold">
            {fullName({ firstName: note.residentFirstName, lastName: note.residentLastName })}:{" "}
          </b>
        ) : null}
        {note.content}
      </>
    ),
    meta: `${note.categoryName} · ${formatWhen(note.createdAt, now, site.timezone)}`,
  });
  const nowTasks: TaskItem[] = [
    ...emergencies.map((item) => ({
      key: item.id,
      href: `/emergencias/${item.id}` as Route,
      title: (
        <>
          <b className="font-semibold">
            Emergencia en curso ·{" "}
            {fullName({ firstName: item.residentFirstName, lastName: item.residentLastName })}
          </b>
        </>
      ),
      meta: `Desde ${formatWhen(item.startedAt, now, site.timezone)}`,
      urgent: true,
    })),
    ...(canHandover && current && canDeliverAt(current, now)
      ? [
          {
            key: "traspaso",
            href: "/turno" as Route,
            title: <b className="font-semibold">Entregar el turno</b>,
            meta: "Revisá el resumen y entregáselo al turno que entra.",
          },
        ]
      : []),
  ];
  const handoverAction =
    canHandover && current ? (
      <Link
        href="/turno"
        className="shrink-0 text-sm font-medium text-primary-ink underline-offset-4 hover:underline"
      >
        {canDeliverAt(current, now)
          ? "Entregar turno"
          : `Entrega en ${duration(current.endsAt.getTime() - now.getTime())}`}
      </Link>
    ) : null;

  const agendaUntil = shiftDays(today, 30);
  const agenda = (controls ?? []).filter((item) => item.nextControlOn <= agendaUntil);

  const adminCards = [
    fees && (fees.dueSoon > 0 || fees.overdue > 0) ? (
      <SummaryLink
        key="abonos"
        href="/abonos"
        title="Abonos"
        text={[
          fees.dueSoon > 0
            ? `${fees.dueSoon} vence${fees.dueSoon === 1 ? "" : "n"} en los próximos ${site.feeReminderDaysBefore} días`
            : null,
          fees.overdue > 0 ? `${fees.overdue} vencida${fees.overdue === 1 ? "" : "s"}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      />
    ) : null,
    requests && requests.abiertas > 0 ? (
      <SummaryLink
        key="solicitudes"
        href="/solicitudes"
        title="Solicitudes de ingreso"
        text={`${
          requests.nuevas > 0
            ? `${requests.nuevas} nueva${requests.nuevas === 1 ? "" : "s"} sin revisar · `
            : ""
        }${requests.abiertas} abierta${requests.abiertas === 1 ? "" : "s"}`}
      />
    ) : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      {header}
      {emergencyServiceNotice}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KpiCard
          icon={Users}
          label="Pacientes activos"
          value={String(counts.active + counts.hospitalized)}
          detail={
            counts.hospitalized > 0
              ? `${counts.hospitalized} internado${counts.hospitalized === 1 ? "" : "s"} fuera`
              : "Ver pacientes"
          }
          href="/pacientes"
        />
        <KpiCard
          icon={ClipboardList}
          label="En seguimiento"
          value={String(pending.length)}
          detail={
            earlier.length > 0 && current
              ? `${earlier.length} de turnos anteriores`
              : "Ver pendientes"
          }
          href="/novedades?ver=pendientes"
          tone={pending.length > 0 ? "attention" : "default"}
        />
        <KpiCard
          icon={NotebookPen}
          label="Novedades del turno"
          value={String(shiftNotes.length)}
          detail={
            lastNote
              ? `Última ${formatWhen(lastNote.createdAt, now, site.timezone)}`
              : "Ninguna todavía"
          }
          href="/novedades?ver=todas"
        />
        {present ? (
          <KpiCard
            icon={UserRound}
            label="Trabajando ahora"
            value={String(present.length)}
            detail={staffActive !== null ? `de ${staffActive} · ver fichaje` : "Ver fichaje"}
            href="/fichaje"
          />
        ) : staffActive !== null ? (
          <KpiCard
            icon={UserRound}
            label="Personal activo"
            value={String(staffActive)}
            detail="Ver personal"
            href="/empleados"
          />
        ) : canHandover ? (
          <KpiCard
            icon={ListChecks}
            label="Traspaso de turno"
            value={
              !current
                ? "—"
                : canDeliverAt(current, now)
                  ? "Ahora"
                  : `${duration(current.endsAt.getTime() - now.getTime())}`
            }
            detail={!current ? "Sin turno en curso" : "Ir al traspaso"}
            href="/turno"
          />
        ) : null}
      </div>

      {setupCard}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card aria-labelledby="tareas" className="overflow-hidden">
          <CardHeader
            id="tareas"
            title="Tareas del turno"
            description="Ordenadas por urgencia. Tocá una para abrirla."
            action={handoverAction}
          />
          <div className="divide-y">
            <TaskBand title="Ahora" hint="emergencias y entrega" items={nowTasks} />
            {current ? (
              <TaskBand
                title="De este turno"
                hint="pendientes abiertos"
                items={thisShift.slice(0, 6).map(noteTask)}
              />
            ) : null}
            <TaskBand
              title={current ? "De turnos anteriores" : "Pendientes"}
              hint="siguen abiertos"
              items={earlier.slice(0, 6).map(noteTask)}
            />
          </div>
          {pending.length > 12 ? (
            <div className="border-t px-5 py-3">
              <Link
                href="/novedades?ver=pendientes"
                className="text-sm font-medium text-primary-ink underline-offset-4 hover:underline"
              >
                Ver los {pending.length} pendientes
              </Link>
            </div>
          ) : null}
        </Card>

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

          {controls ? (
            <Card aria-labelledby="agenda">
              <CardHeader
                id="agenda"
                title="Agenda de la residencia"
                description="Controles de los próximos 30 días."
              />
              {agenda.length === 0 ? (
                <div className="flex flex-col gap-2 px-5 py-4 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <CalendarDays aria-hidden="true" className="size-4" />
                    No hay nada agendado para los próximos 30 días.
                  </p>
                  <Link
                    href="/especialidades"
                    className="font-medium text-primary-ink underline-offset-4 hover:underline"
                  >
                    Gestionar en Especialidades
                  </Link>
                </div>
              ) : (
                <ul className="divide-y">
                  {agenda.slice(0, 6).map((item) => {
                    const [, month, day] = item.nextControlOn.split("-").map(Number);
                    const overdue = item.nextControlOn < today;
                    return (
                      <li key={item.encounterId}>
                        <Link
                          href={`/pacientes/${item.residentId}` as Route}
                          className="flex items-center gap-3 px-5 py-3 hover:bg-muted/60"
                        >
                          <span
                            className={
                              overdue
                                ? "flex size-11 shrink-0 flex-col items-center justify-center rounded-[10px] bg-warning text-warning-foreground"
                                : "flex size-11 shrink-0 flex-col items-center justify-center rounded-[10px] bg-secondary text-secondary-foreground"
                            }
                          >
                            <span className="text-[15px] leading-none font-semibold tabular-nums">
                              {day}
                            </span>
                            <span className="text-[10px] font-medium uppercase">
                              {MONTHS[(month ?? 1) - 1]}
                            </span>
                          </span>
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate text-[15px] font-medium">
                              {fullName({
                                firstName: item.residentFirstName,
                                lastName: item.residentLastName,
                              })}
                            </span>
                            <span className="truncate text-[13px] text-muted-foreground">
                              {overdue ? "Vencido · " : ""}
                              {item.specialtyName} · {item.reason}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
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
                          <b className="font-semibold">
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
        </div>
      </div>

      {adminCards.length > 0 || (missing && missing.total > 0) || canAllActivity ? (
        <section aria-labelledby="administracion" className="flex flex-col gap-3">
          <h2
            id="administracion"
            className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase"
          >
            Administración
          </h2>
          {adminCards.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">{adminCards}</div>
          ) : null}
          <div className="grid items-start gap-4 lg:grid-cols-2">
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
                          <b className="font-semibold">{item.actorName ?? "Sistema"}</b> ·{" "}
                          {actionLabel(item.action).toLocaleLowerCase("es-AR")}
                          {item.residentId && item.residentName ? (
                            <>
                              {" · "}
                              <Link
                                href={`/pacientes/${item.residentId}` as Route}
                                className="text-primary-ink underline-offset-4 hover:underline"
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
        </section>
      ) : null}
    </div>
  );
}

/** Suma días a una fecha "AAAA-MM-DD". */
function shiftDays(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 2000, (month ?? 1) - 1, (day ?? 1) + days));
  return date.toISOString().slice(0, 10);
}
