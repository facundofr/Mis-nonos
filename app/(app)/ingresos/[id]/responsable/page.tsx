import { ChevronRight } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/form-status";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { fullName } from "@/features/residents/format";

import { saveContactAction } from "../../../pacientes/actions";
import { ContactForm } from "../../../pacientes/resident-forms";
import { AdmissionSteps, loadDraftAdmission } from "../../_shared";
import { completeStepAction } from "../../actions";

export const metadata: Metadata = { title: "Ingreso · Responsable" };

/** Paso 2 (diseño IngresoResponsable): responsable de la internación y demás familiares en orden. */
export default async function AdmissionResponsiblePage({
  params,
  searchParams,
}: PageProps<"/ingresos/[id]/responsable">) {
  const { id } = await params;
  const query = await searchParams;
  const { admission, resident, contacts } = await loadDraftAdmission(id);
  const hasResponsible = contacts.some((contact) => contact.isAdmissionResponsible);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader
        title="Nuevo ingreso"
        description={fullName(resident)}
        back={{ href: "/ingresos", label: "Ingresos en curso" }}
      />
      <AdmissionSteps admissionId={id} current={2} completed={admission.currentStep} />
      {query.desde === "solicitud" ? (
        <Notice tone="success">
          Ingreso armado con los datos de la solicitud. Revisá el paso 1 y los contactos
          {hasResponsible ? "" : "; falta marcar al responsable de la internación (con su DNI)"}.
        </Notice>
      ) : null}

      {contacts.length > 0 ? (
        <Card>
          <CardHeader
            title="Contactos cargados"
            description="En el orden en que hay que llamarlos."
          />
          <ul className="divide-y">
            {contacts.map((contact) => (
              <li key={contact.id}>
                <Link
                  href={`/ingresos/${id}/contacto/${contact.id}` as Route}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/60"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-semibold">
                      {contact.emergencyPriority ? `${contact.emergencyPriority}. ` : ""}
                      {contact.name}
                      {contact.relationship
                        ? ` · ${contact.relationship.toLocaleLowerCase("es-AR")}`
                        : ""}
                    </span>
                    {contact.isAdmissionResponsible ? (
                      <Badge tone="primary" className="w-fit">
                        Responsable de la internación
                      </Badge>
                    ) : null}
                  </span>
                  <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title={hasResponsible ? "Agregar otro familiar" : "Responsable de la internación"}
          description={
            hasResponsible
              ? "Los demás familiares, en el orden en que hay que llamarlos."
              : "Quien firma la ficha de ingreso, las obligaciones y los formularios de PAMI."
          }
        />
        <div className="p-5">
          <ContactForm
            key={contacts.length}
            action={saveContactAction.bind(null, resident.id, null, "ingreso")}
            otherContacts={contacts}
            responsibleByDefault={!hasResponsible}
          />
        </div>
      </Card>

      {hasResponsible ? (
        <form action={completeStepAction.bind(null, id, 2)}>
          <SubmitButton className="w-full sm:w-auto" pendingLabel="Guardando…">
            Siguiente: documentación
          </SubmitButton>
        </form>
      ) : (
        <Notice tone="info">Para seguir, cargá primero al responsable de la internación.</Notice>
      )}
    </div>
  );
}
