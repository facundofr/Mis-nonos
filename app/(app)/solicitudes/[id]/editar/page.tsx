import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { getRequest } from "@/features/admission-requests/queries";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";

import { updateRequestAction } from "../../actions";
import { RequestForm, type RequestDefaults } from "../../request-forms";

export const metadata: Metadata = { title: "Editar solicitud" };

const FIELDS = [
  "contactChannel",
  "firstName",
  "lastName",
  "nationalId",
  "birthDate",
  "admissionModality",
  "coverageType",
  "coverageName",
  "coverageMemberNumber",
  "referralInstitution",
  "desiredAdmissionDate",
  "responsibleName",
  "responsibleRelationship",
  "responsibleNationalId",
  "responsiblePhone",
  "responsibleEmail",
  "responsibleAddress",
  "contact2Name",
  "contact2Relationship",
  "contact2Phone",
  "contact3Name",
  "contact3Relationship",
  "contact3Phone",
  "familyMessage",
  "internalNotes",
] as const;

export default async function EditRequestPage({ params }: PageProps<"/solicitudes/[id]/editar">) {
  const context = await requirePermission("admission_requests.manage");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [{ today }, found] = await Promise.all([
    getSiteContext(context),
    inTenant(context, (tx) => getRequest(tx, id)),
  ]);
  if (!found) notFound();
  const { request } = found;
  const open = ["new", "contacting", "waitlisted"].includes(request.status);
  const defaults: RequestDefaults = Object.fromEntries(FIELDS.map((key) => [key, request[key]]));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <PageHeader
        title="Editar solicitud"
        description={`${request.firstName} ${request.lastName}`}
        back={{ href: `/solicitudes/${id}` as Route, label: "Solicitud" }}
      />
      {open ? (
        <RequestForm
          action={updateRequestAction.bind(null, id)}
          defaults={defaults}
          hidden={{ version: request.version }}
          submitLabel="Guardar cambios"
          today={today}
        />
      ) : (
        <Notice tone="warning">La solicitud ya está cerrada: no se puede editar.</Notice>
      )}
    </div>
  );
}
