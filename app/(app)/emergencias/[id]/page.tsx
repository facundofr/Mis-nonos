import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { getEmergency } from "@/features/care/queries";
import { fullName } from "@/features/residents/format";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { formatDateTime } from "@/lib/time/format";

import { CloseEmergencyForm } from "../emergency-forms";

export const metadata: Metadata = { title: "Emergencia" };

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 border-t px-5 py-3 first:border-t-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-[15px] whitespace-pre-line">{value}</dd>
    </div>
  );
}

/** Detalle de una emergencia; si sigue abierta, se completa y se cierra acá. */
export default async function EmergencyPage({
  params,
  searchParams,
}: PageProps<"/emergencias/[id]">) {
  const context = await requirePermission("emergencies.manage");
  const { id } = await params;
  const { registrada, cerrada } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const [{ site }, emergency] = await Promise.all([
    getSiteContext(context),
    inTenant(context, (tx) => getEmergency(tx, id)),
  ]);
  if (!emergency) notFound();
  const name = fullName({
    firstName: emergency.residentFirstName,
    lastName: emergency.residentLastName,
  });
  const open = emergency.status === "open";

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <PageHeader
        title={`Emergencia · ${name}`}
        back={{ href: "/emergencias", label: "Emergencias" }}
      />
      {cerrada ? <Notice tone="success">Emergencia cerrada.</Notice> : null}
      {registrada ? (
        <Notice tone="success">
          Emergencia registrada. Cuando termine, cerrala abajo contando cómo terminó.
        </Notice>
      ) : null}

      <Card>
        <CardHeader
          title={formatDateTime(emergency.startedAt, site.timezone)}
          description={`Registrada por ${emergency.authorName}`}
          action={
            open ? <Badge tone="danger">Abierta</Badge> : <Badge tone="neutral">Cerrada</Badge>
          }
        />
        <dl className="flex flex-col">
          <Row label="Qué pasó" value={emergency.description} />
          <Row label="A quién se llamó" value={emergency.calls} />
          <Row
            label="Traslado"
            value={
              emergency.transferred
                ? emergency.transferDestination
                  ? `Sí, a ${emergency.transferDestination}`
                  : "Sí"
                : "No"
            }
          />
          <Row label="Cómo terminó" value={emergency.outcome} />
          <Row
            label="Cerrada por"
            value={
              emergency.closedAt
                ? `${emergency.closedByName ?? "Otra persona"} · ${formatDateTime(emergency.closedAt, site.timezone)}`
                : null
            }
          />
        </dl>
      </Card>

      <Link
        href={`/pacientes/${emergency.residentId}` as Route}
        className="self-start text-sm font-medium text-primary-ink underline-offset-4 hover:underline"
      >
        Ver la ficha de {name}
      </Link>

      {open ? (
        <Card>
          <CardHeader
            title="Cerrar la emergencia"
            description="Completá lo que falte y contá cómo terminó."
          />
          <div className="p-5">
            <CloseEmergencyForm
              emergencyId={emergency.id}
              defaults={{
                calls: emergency.calls,
                transferred: emergency.transferred,
                transferDestination: emergency.transferDestination,
              }}
            />
          </div>
        </Card>
      ) : null}
    </div>
  );
}
