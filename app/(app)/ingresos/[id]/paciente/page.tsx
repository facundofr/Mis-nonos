import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { getSiteContext } from "@/lib/site/server";

import { ResidentDataForm } from "../../../pacientes/resident-forms";
import { AdmissionSteps, loadDraftAdmission } from "../../_shared";
import { updateAdmissionPatientAction } from "../../actions";
import { CancelAdmissionButton } from "../confirmar/confirm-buttons";

export const metadata: Metadata = { title: "Ingreso · Paciente" };

export default async function AdmissionPatientPage({
  params,
}: PageProps<"/ingresos/[id]/paciente">) {
  const { id } = await params;
  const { context, admission, resident } = await loadDraftAdmission(id);
  const { today } = await getSiteContext(context);
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader title="Nuevo ingreso" back={{ href: "/ingresos", label: "Ingresos en curso" }} />
      <AdmissionSteps admissionId={id} current={1} completed={admission.currentStep} />
      <ResidentDataForm
        action={updateAdmissionPatientAction.bind(null, id)}
        defaults={resident}
        version={resident.version}
        submitLabel="Siguiente: responsable"
        today={today}
      />
      {/* Se puede cancelar desde cualquier paso, no solo desde el último. */}
      <div className="self-start">
        <CancelAdmissionButton admissionId={id} />
      </div>
    </div>
  );
}
