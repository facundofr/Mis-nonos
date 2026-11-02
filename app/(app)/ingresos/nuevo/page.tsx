import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";

import { ResidentDataForm } from "../../pacientes/resident-forms";
import { startAdmissionAction } from "../actions";

export const metadata: Metadata = { title: "Nuevo ingreso" };

/** Paso 1 del ingreso (diseño IngresoPaciente). Al guardar queda en borrador. */
export default async function NewAdmissionPage() {
  const context = await requirePermission("admissions.manage");
  const { today } = await getSiteContext(context);
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader
        title="Nuevo ingreso"
        description="Paso 1 de 4 · Paciente y cobertura. Podés dejarlo a medias y seguir después."
        back={{ href: "/pacientes", label: "Pacientes" }}
      />
      <ResidentDataForm
        action={startAdmissionAction}
        submitLabel="Siguiente: responsable"
        today={today}
      />
    </div>
  );
}
