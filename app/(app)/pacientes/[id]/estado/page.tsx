import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { fullName } from "@/features/residents/format";
import { getResident } from "@/features/residents/queries";
import { inTenant } from "@/lib/actions";
import { getPermissions } from "@/lib/auth/authorization";
import { requireAppContext } from "@/lib/auth/session";
import { getSiteContext } from "@/lib/site/server";
import { redirect } from "next/navigation";

import { DischargeForm, HospitalizeForm, ReturnForm } from "../../resident-forms";

export const metadata: Metadata = { title: "Internación o egreso" };

/** Cambios de estado (F.4): internado fuera, vuelta y egreso sin borrado. */
export default async function ResidentStatusPage({ params }: PageProps<"/pacientes/[id]/estado">) {
  const context = await requireAppContext();
  const permissions = await getPermissions(context);
  const canStatus = permissions.has("residents.status");
  const canDischarge = permissions.has("residents.discharge");
  if (!canStatus && !canDischarge) redirect("/sin-permiso");

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [{ today }, resident] = await Promise.all([
    getSiteContext(context),
    inTenant(context, (tx) => getResident(tx, id)),
  ]);
  if (!resident || !["active", "hospitalized"].includes(resident.status)) notFound();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <PageHeader
        title="Internación o egreso"
        description={fullName(resident)}
        back={{ href: `/pacientes/${id}` as Route, label: "Ficha" }}
      />
      {canStatus && resident.status === "active" ? (
        <Card>
          <CardHeader
            title="Internado fuera"
            description="Sigue siendo paciente de la residencia y su abono sigue corriendo."
          />
          <div className="p-5">
            <HospitalizeForm residentId={id} today={today} />
          </div>
        </Card>
      ) : null}
      {canStatus && resident.status === "hospitalized" ? (
        <Card>
          <CardHeader
            title="Vuelta a la residencia"
            description={`Internado/a en ${resident.hospitalizationPlace}.`}
          />
          <div className="p-5">
            <ReturnForm residentId={id} today={today} />
          </div>
        </Card>
      ) : null}
      {canDischarge ? (
        <Card>
          <CardHeader
            title="Egreso"
            description="Deja de aparecer entre los activos, en emergencias y en el traspaso. No se borra nada: sus datos y contactos se conservan."
          />
          <div className="p-5">
            <DischargeForm residentId={id} today={today} />
          </div>
        </Card>
      ) : null}
    </div>
  );
}
