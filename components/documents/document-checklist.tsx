import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { ResidentDocumentItem } from "@/features/documents/queries";
import { documentsFor } from "@/features/documents/requirements";
import type { DocumentTypeRow } from "@/features/settings/queries";

import { uploadDocumentFileAction } from "@/features/documents/actions";
import { DocumentUploader } from "./document-uploader";

/**
 * Legajo de un paciente (diseños IngresoDocumentos y LegajoPaciente): los
 * documentos que corresponden a su modalidad, qué falta y, con permiso
 * (documents.files), la carga y el visor de fotos. Sin ese permiso se ve
 * solo el estado, sin fotos (F.3, nota 5).
 */
export function DocumentChecklist({
  residentId,
  modality,
  types,
  documents,
  canFiles,
}: {
  residentId: string;
  modality: string;
  types: DocumentTypeRow[];
  documents: Map<string, ResidentDocumentItem>;
  canFiles: boolean;
}) {
  const applicable = documentsFor(types, modality);
  const required = applicable.filter((type) => type.required);
  const done = required.filter((type) => (documents.get(type.id)?.files.length ?? 0) > 0);

  return (
    <div className="flex flex-col">
      <p className="border-b px-5 py-3 text-sm text-muted-foreground">
        {done.length} de {required.length} obligatorios cargados
      </p>
      <ul className="divide-y">
        {applicable.map((type) => {
          const count = documents.get(type.id)?.files.length ?? 0;
          return (
            <li key={type.id} className="flex flex-col gap-3 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{type.name}</span>
                  {type.description ? (
                    <span className="text-sm text-muted-foreground">{type.description}</span>
                  ) : null}
                </span>
                {count > 0 ? (
                  <Badge tone="success">
                    Cargado · {count} {count === 1 ? "archivo" : "archivos"}
                  </Badge>
                ) : (
                  <Badge tone={type.required ? "warning" : "neutral"}>
                    {type.required ? "Falta" : "Opcional"}
                  </Badge>
                )}
              </div>
              {canFiles ? (
                <div className="flex flex-wrap items-start gap-2">
                  <DocumentUploader
                    upload={uploadDocumentFileAction.bind(null, residentId, type.id)}
                  />
                  {count > 0 ? (
                    <Link
                      href={`/pacientes/${residentId}/legajo/${type.id}` as Route}
                      className="inline-flex h-11 items-center gap-1 rounded-lg px-3 text-[15px] font-medium text-primary hover:bg-muted"
                    >
                      Ver
                      <ChevronRight aria-hidden="true" className="size-4" />
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
