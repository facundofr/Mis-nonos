import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { NURSING_SPECIALTY_KEY } from "@/db/schema/care";
import { getEncounter, getSpecialty } from "@/features/care/queries";
import { ENCOUNTER_LOCATIONS, type EncounterLocation } from "@/features/care/schemas";
import { fullName } from "@/features/residents/format";
import { inTenant } from "@/lib/actions";
import { can, requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { formatDateKey, formatDateTime } from "@/lib/time/format";

import { VoidEncounterForm } from "../encounter-forms";

export const metadata: Metadata = { title: "Atención" };

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 border-t px-5 py-3 first:border-t-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-[15px] whitespace-pre-line">{value}</dd>
    </div>
  );
}

/** Detalle de una atención. No se edita: si hubo un error, se anula con motivo. */
export default async function EncounterPage({
  params,
  searchParams,
}: PageProps<"/atenciones/[id]">) {
  const context = await requirePermission("care.read");
  const { id } = await params;
  const { registrada, anulada } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const [{ site }, canRecord] = await Promise.all([
    getSiteContext(context),
    can(context, "care.record"),
  ]);
  const data = await inTenant(context, async (tx) => {
    const encounter = await getEncounter(tx, id);
    if (!encounter) return null;
    return { encounter, specialty: await getSpecialty(tx, encounter.specialtyId) };
  });
  if (!data) notFound();
  const { encounter, specialty } = data;
  const name = fullName({
    firstName: encounter.residentFirstName,
    lastName: encounter.residentLastName,
  });
  const back =
    specialty?.key === NURSING_SPECIALTY_KEY
      ? { href: "/enfermeria" as Route, label: "Enfermería" }
      : {
          href: `/especialidades/${encounter.specialtyId}` as Route,
          label: encounter.specialtyName,
        };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <PageHeader title={`${encounter.specialtyName} · ${name}`} back={back} />
      {registrada ? <Notice tone="success">Atención registrada.</Notice> : null}
      {anulada ? (
        <Notice tone="success">Atención anulada. Si hacía falta, registrala de nuevo.</Notice>
      ) : null}
      {encounter.voidedAt ? (
        <Notice tone="warning">
          Anulada por {encounter.voidedByName ?? "otra persona"} el{" "}
          {formatDateTime(encounter.voidedAt, site.timezone)}: {encounter.voidReason}
        </Notice>
      ) : null}

      <Card>
        <CardHeader
          title={encounter.reason}
          description={formatDateTime(encounter.occurredAt, site.timezone)}
          action={encounter.voidedAt ? <Badge tone="neutral">Anulada</Badge> : null}
        />
        <dl className="flex flex-col">
          <Row label="Paciente" value={name} />
          <Row label="Atendió" value={encounter.professionalName ?? encounter.authorName} />
          <Row
            label="Dónde"
            value={ENCOUNTER_LOCATIONS[encounter.location as EncounterLocation] ?? null}
          />
          <Row label="Observaciones" value={encounter.notes} />
          <Row label="Indicaciones" value={encounter.instructions} />
          <Row
            label="Próximo control"
            value={encounter.nextControlOn ? formatDateKey(encounter.nextControlOn) : null}
          />
          <Row
            label="Registrada por"
            value={`${encounter.authorName} · ${formatDateTime(encounter.createdAt, site.timezone)}`}
          />
        </dl>
      </Card>

      <Link
        href={`/pacientes/${encounter.residentId}` as Route}
        className="self-start text-sm font-medium text-primary-ink underline-offset-4 hover:underline"
      >
        Ver la ficha de {name}
      </Link>

      {canRecord && !encounter.voidedAt ? (
        <details className="rounded-[14px] border bg-card">
          <summary className="flex h-12 cursor-pointer items-center px-4 text-[15px] font-medium">
            ¿Hay un error? Anular la atención
          </summary>
          <div className="p-4 pt-0">
            <VoidEncounterForm encounterId={encounter.id} />
          </div>
        </details>
      ) : null}
    </div>
  );
}
