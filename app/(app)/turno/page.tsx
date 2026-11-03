import { History } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { getHandover, handoverSummary, listHandoverVersions } from "@/features/handover/queries";
import {
  canConfirmAt,
  canDeliverAt,
  deliveryWindow,
  focusOccurrence,
  incomingShift,
} from "@/features/handover/rules";
import { inTenant } from "@/lib/actions";
import { getPermissions, requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { formatDateKey, formatDateTime, formatTime } from "@/lib/time/format";
import { shiftLabel, shiftOccurrenceOn } from "@/lib/time/shifts";

import { NoteList } from "../novedades/note-list";
import { ConfirmForm, DeliverForm } from "./handover-forms";
import { PageTip } from "../guia/page-tip";

export const metadata: Metadata = { title: "Traspaso de turno" };

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-[14px] border bg-card px-2 py-3">
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      <span className="text-[13px] text-muted-foreground">{label}</span>
    </div>
  );
}

/**
 * Traspaso de turno (diseño MovilTurnos, 7.3-G, F.4): resumen del turno,
 * pendientes, nota para el entrante, entrega y confirmación. Con
 * ?turno=&fecha= muestra un traspaso anterior (historial).
 */
export default async function HandoverPage({ searchParams }: PageProps<"/turno">) {
  const context = await requirePermission("residents.read");
  const params = await searchParams;
  const [permissions, { site, shifts }] = await Promise.all([
    getPermissions(context),
    getSiteContext(context),
  ]);
  const now = new Date();

  const requested = z
    .object({ turno: z.uuid(), fecha: z.iso.date() })
    .safeParse({ turno: params.turno, fecha: params.fecha });
  const requestedShift = requested.success
    ? shifts.find((shift) => shift.id === requested.data.turno)
    : undefined;
  const occurrence =
    requested.success && requestedShift
      ? shiftOccurrenceOn(requestedShift, requested.data.fecha, site.timezone)
      : focusOccurrence(shifts, now, site.timezone);

  if (!occurrence || occurrence.startsAt > now) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <PageHeader title="Traspaso de turno" />
        <div className="rounded-[14px] border bg-card">
          <EmptyState icon={History} title="Sin turnos configurados">
            Administración define los turnos en Configuración → Turnos.
          </EmptyState>
        </div>
      </div>
    );
  }

  const { shift, shiftDate } = occurrence;
  const data = await inTenant(context, async (tx) => {
    const handover = await getHandover(tx, site.id, shift.id, shiftDate);
    return {
      handover,
      summary: await handoverSummary(tx, site.id, occurrence, handover, now),
      versions:
        handover && handover.version > 1 && permissions.has("audit.read_resident")
          ? await listHandoverVersions(tx, handover.id)
          : [],
    };
  });
  const { handover, summary, versions } = data;
  const incoming = incomingShift(shifts, occurrence, site.timezone);
  const delivering = canDeliverAt(occurrence, now);
  const canDeliver = permissions.has("handover.deliver") && delivering && !handover?.confirmedAt;
  const canConfirm =
    site.handoverRequiresConfirmation &&
    permissions.has("handover.confirm") &&
    handover &&
    !handover.confirmedAt &&
    canConfirmAt(shifts, occurrence, site.timezone, now);
  const ended = occurrence.endsAt <= now;
  const { opensAt, closesAt } = deliveryWindow(occurrence);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <PageHeader
        title="Traspaso de turno"
        description={`${shiftLabel(shift)}${incoming ? ` → ${shiftLabel(incoming.shift)}` : ""} · ${formatDateKey(shiftDate)}`}
        actions={
          <Link
            href="/turno/historial"
            className={buttonClassName({ variant: "outline", size: "md" })}
          >
            <History aria-hidden="true" className="size-4" />
            Historial
          </Link>
        }
      />
      <PageTip context={context} tip="turno" />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {handover ? (
          <>
            <Badge tone="success">Entregado</Badge>
            <span className="text-muted-foreground">
              {handover.deliveredByName} · {formatDateTime(handover.deliveredAt, site.timezone)}
              {handover.version > 1 ? ` · versión ${handover.version}` : ""}
            </span>
            {handover.confirmedAt ? (
              <>
                <Badge tone="primary">Recepción confirmada</Badge>
                <span className="text-muted-foreground">
                  {handover.confirmedByName} · {formatTime(handover.confirmedAt, site.timezone)}
                </span>
              </>
            ) : site.handoverRequiresConfirmation ? (
              <Badge tone="warning">Falta confirmar la recepción</Badge>
            ) : null}
          </>
        ) : ended && !delivering ? (
          <Badge tone="warning">Sin entrega</Badge>
        ) : (
          <Badge tone="neutral">{ended ? "Todavía sin entregar" : "Turno en curso"}</Badge>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <Stat value={summary.notes.length} label="Novedades" />
        <Stat value={summary.pending.length} label="Pendientes" />
        <Stat value={summary.resolvedCount} label="Resueltas" />
      </div>

      {handover?.note ? (
        <Card aria-labelledby="nota-entrante">
          <CardHeader id="nota-entrante" title="Nota para el turno entrante" />
          <p className="px-5 py-4 text-[15px] leading-relaxed whitespace-pre-line">
            {handover.note}
          </p>
        </Card>
      ) : null}

      {canConfirm ? <ConfirmForm shiftId={shift.id} shiftDate={shiftDate} /> : null}

      <section aria-labelledby="pendientes" className="flex flex-col gap-2.5">
        <h2 id="pendientes" className="text-lg font-semibold">
          Quedan pendientes
        </h2>
        <NoteList
          notes={summary.pending}
          now={now}
          timeZone={site.timezone}
          canResolve={permissions.has("notes.resolve")}
          empty={{ title: "Sin pendientes", body: "No quedan seguimientos abiertos." }}
        />
      </section>

      {canDeliver ? (
        <Card>
          <CardHeader
            title={handover ? "Completar la entrega" : "Entregar el turno"}
            description={
              handover
                ? "Si cambiás la nota, queda como una versión nueva."
                : `Se puede entregar de ${formatTime(opensAt, site.timezone)} a ${formatTime(closesAt, site.timezone)}.`
            }
          />
          <div className="p-5">
            <DeliverForm
              shiftId={shift.id}
              shiftDate={shiftDate}
              version={handover?.version ?? 0}
              defaultNote={handover?.note ?? ""}
              hint={
                site.handoverRequiresConfirmation
                  ? "El turno entrante confirma la recepción desde su teléfono."
                  : "Queda registrado con tu usuario, fecha y hora."
              }
            />
          </div>
        </Card>
      ) : !handover && !ended && permissions.has("handover.deliver") ? (
        <Notice tone="info">
          La entrega se habilita a las {formatTime(opensAt, site.timezone)}, una hora antes de que
          termine el turno.
        </Notice>
      ) : null}

      <section aria-labelledby="novedades-turno" className="flex flex-col gap-2.5">
        <h2 id="novedades-turno" className="text-lg font-semibold">
          Novedades del turno
        </h2>
        <NoteList
          notes={summary.notes}
          now={now}
          timeZone={site.timezone}
          canResolve={false}
          empty={{ title: "Sin novedades", body: "No se registraron novedades en este turno." }}
        />
      </section>

      {versions.length > 1 ? (
        <Card>
          <CardHeader title="Entregas anteriores" />
          <ol className="flex flex-col">
            {versions.map((version) => (
              <li key={version.version} className="flex flex-col gap-1 border-t px-5 py-4">
                <span className="text-sm text-muted-foreground">
                  Versión {version.version} · {version.deliveredByName} ·{" "}
                  {formatDateTime(version.deliveredAt, site.timezone)}
                </span>
                <p className="text-[15px] whitespace-pre-line">{version.note ?? "Sin nota."}</p>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      {requested.success ? (
        <Link
          href={"/turno" as Route}
          className="w-fit text-sm font-medium text-primary-ink underline-offset-4 hover:underline"
        >
          Ver el traspaso actual
        </Link>
      ) : null}
    </div>
  );
}
