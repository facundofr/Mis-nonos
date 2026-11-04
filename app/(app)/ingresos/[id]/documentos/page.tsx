import type { Metadata } from "next";

import { DocumentChecklist } from "@/components/documents/document-checklist";
import { Card, CardHeader } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/form-status";
import { PageHeader } from "@/components/ui/page-header";
import { listResidentDocuments } from "@/features/documents/queries";
import { fullName } from "@/features/residents/format";
import { listDocumentTypes } from "@/features/settings/queries";
import { inTenant } from "@/lib/actions";
import { can } from "@/lib/auth/authorization";

import { AdmissionSteps, loadDraftAdmission } from "../../_shared";
import { completeStepAction } from "../../actions";
import { CancelAdmissionButton } from "../confirmar/confirm-buttons";

export const metadata: Metadata = { title: "Ingreso · Documentación" };

/**
 * Paso 3 (diseño IngresoDocumentos): checklist del legajo según la modalidad,
 * con foto de cada papel firmado. Se puede seguir aunque falte algo: queda
 * pendiente en la ficha y en el Inicio de Administración (6.12).
 */
export default async function AdmissionDocumentsPage({
  params,
}: PageProps<"/ingresos/[id]/documentos">) {
  const { id } = await params;
  const { context, admission, resident } = await loadDraftAdmission(id);
  const [types, documents, canFiles] = await Promise.all([
    inTenant(context, (tx) => listDocumentTypes(tx)),
    inTenant(context, (tx) => listResidentDocuments(tx, resident.id)),
    can(context, "documents.files"),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader
        title="Nuevo ingreso"
        description={fullName(resident)}
        back={{ href: "/ingresos", label: "Ingresos en curso" }}
      />
      <AdmissionSteps admissionId={id} current={3} completed={admission.currentStep} />
      <Card>
        <CardHeader
          title="Documentación"
          description="Se firma en papel y se sube con foto. Los formularios de PAMI se siguen firmando en el papel oficial."
        />
        <DocumentChecklist
          residentId={resident.id}
          modality={resident.admissionModality}
          types={types}
          documents={documents}
          canFiles={canFiles}
        />
      </Card>
      <form action={completeStepAction.bind(null, id, 3)}>
        <SubmitButton className="w-full sm:w-auto" pendingLabel="Guardando…">
          Siguiente: revisar
        </SubmitButton>
      </form>
      <div className="self-start">
        <CancelAdmissionButton admissionId={id} />
      </div>
    </div>
  );
}
