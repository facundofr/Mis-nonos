import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PageHeader } from "@/components/ui/page-header";
import { fullName } from "@/features/residents/format";
import { getResident } from "@/features/residents/queries";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";

import { updateResidentAction } from "../../actions";
import { ResidentDataForm } from "../../resident-forms";

export const metadata: Metadata = { title: "Editar paciente" };

/** "Editar paciente" (DC-13: el alta es solo por el ingreso guiado). */
export default async function EditResidentPage({ params }: PageProps<"/pacientes/[id]/editar">) {
  const context = await requirePermission("residents.update");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [{ today }, resident] = await Promise.all([
    getSiteContext(context),
    inTenant(context, (tx) => getResident(tx, id)),
  ]);
  if (!resident || !["active", "hospitalized"].includes(resident.status)) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader
        title="Editar paciente"
        description={fullName(resident)}
        back={{ href: `/pacientes/${id}` as Route, label: "Ficha" }}
      />
      <ResidentDataForm
        action={updateResidentAction.bind(null, id)}
        defaults={resident}
        version={resident.version}
        submitLabel="Guardar cambios"
        today={today}
      />
    </div>
  );
}
