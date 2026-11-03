import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { REQUIRED_FOR_LABELS } from "@/features/settings/schemas";
import { listDocumentTypes } from "@/features/settings/queries";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";

import { DocumentTypeForm, MoveButtons } from "../settings-forms";

export const metadata: Metadata = { title: "Documentos del legajo" };

/** Checklist del legajo por modalidad (7.3-C2, F1-ING-03). */
export default async function DocumentTypesSettingsPage() {
  const context = await requirePermission("settings.manage");
  const documents = await inTenant(context, (tx) => listDocumentTypes(tx));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader
        title="Documentos del legajo"
        description="Lo que se pide en cada ingreso, en este orden. Los formularios se siguen firmando en papel: la app guarda la foto."
        back={{ href: "/configuracion", label: "Configuración" }}
      />
      <ul className="flex flex-col gap-2">
        {documents.map((document, index) => (
          <li key={document.id} className="rounded-[14px] border bg-card">
            <div className="flex items-start justify-between gap-3 px-4 py-3">
              <span className="flex min-w-0 flex-col gap-1.5">
                <span className="font-medium">{document.name}</span>
                <span className="flex flex-wrap gap-1.5">
                  <Badge tone="primary">
                    {REQUIRED_FOR_LABELS[document.requiredFor as keyof typeof REQUIRED_FOR_LABELS]}
                  </Badge>
                  <Badge tone={document.required ? "warning" : "neutral"}>
                    {document.required ? "Obligatorio" : "Opcional"}
                  </Badge>
                  {document.active ? null : <Badge>Inactivo</Badge>}
                </span>
              </span>
              <MoveButtons
                catalog="document_types"
                itemId={document.id}
                first={index === 0}
                last={index === documents.length - 1}
                name={document.name}
              />
            </div>
            <details className="border-t px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-primary-ink">
                Editar
              </summary>
              <div className="pt-4">
                <DocumentTypeForm documentType={document} />
              </div>
            </details>
          </li>
        ))}
      </ul>
      <Card>
        <CardHeader title="Agregar documento" />
        <div className="p-5">
          <DocumentTypeForm />
        </div>
      </Card>
    </div>
  );
}
