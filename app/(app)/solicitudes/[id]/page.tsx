import { Pencil, TriangleAlert } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { ActivityList } from "@/components/activity/activity-list";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { listEntityActivity } from "@/features/activity/queries";
import { findRequestDuplicates, getRequest } from "@/features/admission-requests/queries";
import {
  CHANNEL_LABELS,
  DISCARD_LABELS,
  STATUS_LABELS,
} from "@/features/admission-requests/schemas";
import { formatNationalId, telHref } from "@/features/residents/format";
import { COVERAGE_TYPES, MODALITIES } from "@/features/residents/schemas";
import { inTenant } from "@/lib/actions";
import { getPermissions, requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { formatDateKey, formatDateTime } from "@/lib/time/format";

import { ConvertForm, DiscardForm, StatusButtons } from "../request-forms";

export const metadata: Metadata = { title: "Solicitud de ingreso" };

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid gap-0.5 py-2.5 sm:grid-cols-[13rem_1fr] sm:gap-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-[15px] whitespace-pre-line">{value || "—"}</dd>
    </div>
  );
}

/** Detalle de una solicitud (7.3-C3): convertir en ingreso, cambiar el estado o descartar. */
export default async function RequestPage({
  params,
  searchParams,
}: PageProps<"/solicitudes/[id]">) {
  const context = await requirePermission("admission_requests.manage");
  const { id } = await params;
  const query = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const [permissions, { site }] = await Promise.all([
    getPermissions(context),
    getSiteContext(context),
  ]);
  const data = await inTenant(context, async (tx) => {
    const found = await getRequest(tx, id);
    if (!found) return null;
    return {
      ...found,
      duplicates: await findRequestDuplicates(tx, found.request),
      activity: await listEntityActivity(tx, { type: "admission_request", id }),
    };
  });
  if (!data) notFound();
  const { request, createdByName, duplicates, activity } = data;
  const open = ["new", "contacting", "waitlisted"].includes(request.status);
  const blockingResident = duplicates.residents[0];
  const contacts = [
    [request.contact2Name, request.contact2Relationship, request.contact2Phone],
    [request.contact3Name, request.contact3Relationship, request.contact3Phone],
  ].filter(([name]) => name);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <PageHeader
        title={`${request.firstName} ${request.lastName}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={open ? "warning" : request.status === "converted" ? "success" : "neutral"}>
              {STATUS_LABELS[request.status as keyof typeof STATUS_LABELS]}
            </Badge>
            <span>
              {request.origin === "landing"
                ? "Formulario web"
                : `${CHANNEL_LABELS[request.contactChannel as keyof typeof CHANNEL_LABELS] ?? "Cargada en la app"}${createdByName ? ` · cargada por ${createdByName}` : ""}`}{" "}
              · {formatDateTime(request.createdAt, site.timezone)}
            </span>
          </span>
        }
        back={{ href: "/solicitudes", label: "Solicitudes" }}
        actions={
          open ? (
            <Link
              href={`/solicitudes/${id}/editar` as Route}
              className={buttonClassName({ variant: "outline", size: "md" })}
            >
              <Pencil aria-hidden="true" className="size-4" />
              Editar
            </Link>
          ) : undefined
        }
      />
      {query.creada ? <Notice tone="success">Solicitud guardada en la bandeja.</Notice> : null}
      {query.guardada ? <Notice tone="success">Los cambios quedaron guardados.</Notice> : null}

      {duplicates.residents.length > 0 || duplicates.requests.length > 0 ? (
        <div
          role="note"
          className="flex items-start gap-2.5 rounded-lg border border-warning-foreground/30 bg-warning px-4 py-3 text-sm text-warning-foreground"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <div className="flex flex-col gap-1">
            <p className="font-semibold">Puede estar repetida: hay registros con el mismo DNI.</p>
            {duplicates.residents.map((resident) => (
              <Link
                key={resident.id}
                href={`/pacientes/${resident.id}` as Route}
                className="underline underline-offset-4"
              >
                Paciente: {resident.firstName} {resident.lastName}
                {resident.status === "admission_draft" ? " (ingreso en curso)" : ""}
              </Link>
            ))}
            {duplicates.requests.map((other) => (
              <Link
                key={other.id}
                href={`/solicitudes/${other.id}` as Route}
                className="underline underline-offset-4"
              >
                Otra solicitud: {other.firstName} {other.lastName} (
                {STATUS_LABELS[other.status as keyof typeof STATUS_LABELS].toLocaleLowerCase(
                  "es-AR",
                )}
                )
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {request.status === "converted" && request.convertedAdmissionId ? (
        <Notice tone="success">
          Se convirtió en ingreso.{" "}
          <Link
            href={`/ingresos/${request.convertedAdmissionId}` as Route}
            className="font-semibold underline underline-offset-4"
          >
            Ver el ingreso
          </Link>
        </Notice>
      ) : null}
      {request.status === "discarded" ? (
        <Notice tone="info">
          Descartada: {DISCARD_LABELS[request.discardReason as keyof typeof DISCARD_LABELS]}
          {request.discardNotes ? `. ${request.discardNotes}` : "."}
        </Notice>
      ) : null}

      {open ? (
        <Card>
          <CardHeader title="Qué sigue" />
          <div className="flex flex-col gap-5 p-5">
            {permissions.has("admissions.manage") ? (
              blockingResident ? (
                <Notice tone="warning">
                  No se puede convertir: ya hay un paciente con ese DNI. Revisalo antes de seguir.
                </Notice>
              ) : (
                <ConvertForm requestId={id} blocked={false} />
              )
            ) : null}
            <StatusButtons requestId={id} status={request.status} />
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Futuro paciente" />
        <dl className="divide-y px-5 py-1">
          <Row label="DNI" value={formatNationalId(request.nationalId)} />
          <Row
            label="Nacimiento"
            value={request.birthDate ? formatDateKey(request.birthDate) : null}
          />
          <Row
            label="Modalidad"
            value={
              request.admissionModality
                ? MODALITIES[request.admissionModality as keyof typeof MODALITIES]
                : null
            }
          />
          <Row
            label="Cobertura"
            value={[
              request.coverageType
                ? COVERAGE_TYPES[request.coverageType as keyof typeof COVERAGE_TYPES]
                : null,
              request.coverageName,
              request.coverageMemberNumber,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
          <Row label="Institución que lo deriva" value={request.referralInstitution} />
          <Row
            label="Fecha deseada"
            value={
              request.desiredAdmissionDate ? formatDateKey(request.desiredAdmissionDate) : null
            }
          />
        </dl>
      </Card>

      <Card>
        <CardHeader title="Responsable y familia" />
        <dl className="divide-y px-5 py-1">
          <Row
            label="Responsable"
            value={[request.responsibleName, request.responsibleRelationship]
              .filter(Boolean)
              .join(" · ")}
          />
          <div className="grid gap-0.5 py-2.5 sm:grid-cols-[13rem_1fr] sm:gap-3">
            <dt className="text-sm text-muted-foreground">Teléfono</dt>
            <dd>
              <a
                href={telHref(request.responsiblePhone)}
                className="text-[15px] font-medium text-primary underline-offset-4 hover:underline"
              >
                {request.responsiblePhone}
              </a>
            </dd>
          </div>
          <Row label="Email" value={request.responsibleEmail} />
          <Row
            label="DNI del responsable"
            value={formatNationalId(request.responsibleNationalId)}
          />
          <Row label="Domicilio" value={request.responsibleAddress} />
          {contacts.map(([name, relationship, phone], index) => (
            <Row
              key={index}
              label={`Familiar ${index + 1}`}
              value={[name, relationship, phone].filter(Boolean).join(" · ")}
            />
          ))}
        </dl>
      </Card>

      <Card>
        <CardHeader title="Notas" />
        <dl className="divide-y px-5 py-1">
          <Row label="Lo que contó la familia" value={request.familyMessage} />
          <Row label="Notas internas" value={request.internalNotes} />
        </dl>
      </Card>

      {open ? (
        <Card>
          <CardHeader
            title="Descartar"
            description="Si no hay vacante, mejor «En espera». Las descartadas se borran a los 12 meses."
          />
          <div className="p-5">
            <DiscardForm requestId={id} />
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Actividad" />
        <ActivityList items={activity} timeZone={site.timezone} />
      </Card>
    </div>
  );
}
