import { History } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { z } from "zod";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Select } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { actionLabel, fieldLabel, formatValue } from "@/features/activity/labels";
import { isLogGroup, logGroupOf, LOG_GROUPS } from "@/features/activity/log-groups";
import { listAuditLog, type AuditLogItem } from "@/features/activity/queries";
import { listMembers } from "@/features/users/queries";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { formatDateTime } from "@/lib/time/format";
import { addDays, fromLocal } from "@/lib/time/zoned";

export const metadata: Metadata = { title: "Registro de cambios" };

const PAGE_SIZE = 50;

const ENTITY_LABELS: Record<string, string> = {
  admission_request: "Solicitud de ingreso",
  attendance_record: "Fichaje",
  care_encounter: "Atención",
  document_type: "Tipo de documento",
  emergency: "Emergencia",
  invitation: "Invitación",
  membership: "Persona del equipo",
  note: "Novedad",
  note_category: "Categoría de novedades",
  organization: "Residencia",
  professional: "Profesional",
  resident: "Paciente",
  shift: "Turno",
  shift_handover: "Traspaso de turno",
  site: "Residencia",
  specialty: "Especialidad",
  user: "Usuario",
};

const GROUP_BADGES: Record<keyof typeof LOG_GROUPS, { label: string; tone: BadgeTone }> = {
  altas: { label: "Alta", tone: "success" },
  cambios: { label: "Cambio", tone: "info" },
  bajas: { label: "Baja", tone: "danger" },
  aperturas: { label: "Apertura", tone: "neutral" },
};

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Medianoche local de un día AAAA-MM-DD, como instante. */
function startOfDay(key: string, timeZone: string, plusDays = 0): Date {
  const [year, month, day] = key.split("-").map(Number) as [number, number, number];
  const date = addDays({ year, month, day }, plusDays);
  return fromLocal({ ...date, hour: 0, minute: 0 }, timeZone);
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** A qué se refiere el cambio, con enlace si hay una pantalla para verlo. */
function subjectOf(item: AuditLogItem): { label: string; href?: Route } {
  if (item.residentId && item.residentName) {
    return {
      label: item.residentName,
      href: `/pacientes/${item.residentId}?tab=actividad` as Route,
    };
  }
  if (item.targetMembershipId && item.targetName) {
    return { label: item.targetName, href: `/usuarios/${item.targetMembershipId}` as Route };
  }
  return { label: ENTITY_LABELS[item.entityType] ?? item.entityType };
}

/**
 * Registro de cambios (Master, docs/decisions/0021): todo lo que se hizo en
 * la residencia, quién y cuándo, con los valores de antes y después. En la
 * app nada se borra: las bajas (anular, descartar, desactivar) están acá.
 */
export default async function AuditLogPage({ searchParams }: PageProps<"/registro">) {
  const context = await requirePermission("audit.master");
  const params = await searchParams;
  const { site } = await getSiteContext(context);

  const actor = z.uuid().safeParse(first(params.persona));
  const groupParam = first(params.tipo);
  const group = isLogGroup(groupParam) ? groupParam : null;
  const from = dateKey.safeParse(first(params.desde));
  const until = dateKey.safeParse(first(params.hasta));
  const search = (first(params.buscar) ?? "").slice(0, 80);
  const page = Math.max(1, Math.min(1000, Number.parseInt(first(params.pagina) ?? "1", 10) || 1));

  const { log, members } = await inTenant(context, async (tx) => ({
    log: await listAuditLog(
      tx,
      {
        actorUserId: actor.success ? actor.data : null,
        group,
        from: from.success ? startOfDay(from.data, site.timezone) : null,
        until: until.success ? startOfDay(until.data, site.timezone, 1) : null,
        search,
      },
      { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE },
    ),
    members: await listMembers(tx),
  }));

  const pageHref = (target: number) => {
    const query = new URLSearchParams();
    if (actor.success) query.set("persona", actor.data);
    if (group) query.set("tipo", group);
    if (from.success) query.set("desde", from.data);
    if (until.success) query.set("hasta", until.data);
    if (search) query.set("buscar", search);
    if (target > 1) query.set("pagina", String(target));
    const text = query.toString();
    return (text ? `/registro?${text}` : "/registro") as Route;
  };
  const filtered = actor.success || group || from.success || until.success || search;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <PageHeader
        title="Registro de cambios"
        description="Todo lo que se hizo en la residencia: quién, qué, cuándo y qué cambió. Nada se borra: las anulaciones y bajas quedan acá."
      />

      <form
        method="get"
        className="grid gap-3 rounded-[14px] border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <Field id="persona" label="Persona">
          {(control) => (
            <Select {...control} name="persona" defaultValue={actor.success ? actor.data : ""}>
              <option value="">Todas</option>
              {members.map((member) => (
                <option key={member.membershipId} value={member.userId}>
                  {member.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field id="tipo" label="Tipo de cambio">
          {(control) => (
            <Select {...control} name="tipo" defaultValue={group ?? ""}>
              <option value="">Todos</option>
              {Object.entries(LOG_GROUPS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field id="buscar" label="Buscar" hint="Nombre del paciente o de la persona.">
          {(control) => <Input {...control} name="buscar" type="search" defaultValue={search} />}
        </Field>
        <Field id="desde" label="Desde">
          {(control) => (
            <Input
              {...control}
              name="desde"
              type="date"
              defaultValue={from.success ? from.data : ""}
            />
          )}
        </Field>
        <Field id="hasta" label="Hasta">
          {(control) => (
            <Input
              {...control}
              name="hasta"
              type="date"
              defaultValue={until.success ? until.data : ""}
            />
          )}
        </Field>
        <div className="flex items-end gap-2">
          <button type="submit" className={buttonClassName({ size: "md" })}>
            Filtrar
          </button>
          {filtered ? (
            <Link href="/registro" className={buttonClassName({ size: "md", variant: "ghost" })}>
              Limpiar
            </Link>
          ) : null}
        </div>
      </form>

      {log.items.length === 0 ? (
        <div className="rounded-[14px] border bg-card">
          <EmptyState icon={History} title="Sin cambios para mostrar">
            {filtered ? "Probá con otros filtros." : "Acá aparece cada cambio de la residencia."}
          </EmptyState>
        </div>
      ) : (
        <ol className="flex flex-col rounded-[14px] border bg-card" aria-label="Cambios">
          {log.items.map((item) => {
            const kind = logGroupOf(item.action);
            const subject = subjectOf(item);
            const changes = Object.entries(item.changes ?? {});
            const fromLanding =
              item.action === "admission_request.created" && item.metadata?.origin === "landing";
            return (
              <li
                key={item.id}
                className="flex flex-col gap-1.5 border-b px-4 py-3.5 last:border-b-0 sm:px-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge tone={GROUP_BADGES[kind].tone}>{GROUP_BADGES[kind].label}</Badge>
                    <span className="font-medium">{actionLabel(item.action)}</span>
                  </span>
                  <time
                    dateTime={item.occurredAt.toISOString()}
                    className="text-[13px] text-muted-foreground tabular-nums"
                  >
                    {formatDateTime(item.occurredAt, site.timezone)}
                  </time>
                </div>
                <span className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {item.actorName ?? (fromLanding ? "Familia (formulario web)" : "Sistema")}
                  </span>
                  {" · "}
                  {subject.href ? (
                    <Link
                      href={subject.href}
                      className="text-primary-ink underline-offset-4 hover:underline"
                    >
                      {subject.label}
                    </Link>
                  ) : (
                    subject.label
                  )}
                </span>
                {changes.length > 0 ? (
                  <dl className="mt-1 grid gap-1 rounded-lg bg-muted/60 p-3 text-[13px]">
                    {changes.map(([field, change]) => (
                      <div key={field} className="grid gap-x-2 sm:grid-cols-[11rem_1fr]">
                        <dt className="font-medium">{fieldLabel(field)}</dt>
                        <dd className="break-words text-muted-foreground">
                          {change.antes === null || change.antes === undefined ? (
                            formatValue(field, change.despues)
                          ) : (
                            <>
                              <span className="line-through">
                                {formatValue(field, change.antes)}
                              </span>
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
      )}

      {page > 1 || log.hasMore ? (
        <nav aria-label="Páginas" className="flex items-center justify-between gap-3">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className={buttonClassName({ size: "md", variant: "outline" })}
            >
              Más nuevos
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted-foreground">Página {page}</span>
          {log.hasMore ? (
            <Link
              href={pageHref(page + 1)}
              className={buttonClassName({ size: "md", variant: "outline" })}
            >
              Más viejos
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
