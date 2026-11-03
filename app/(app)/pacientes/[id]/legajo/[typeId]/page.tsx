import { eq } from "drizzle-orm";
import { FileText } from "lucide-react";
import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { DocumentUploader } from "@/components/documents/document-uploader";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import * as schema from "@/db/schema";
import { removeDocumentFileAction, uploadDocumentFileAction } from "@/features/documents/actions";
import { listResidentDocuments } from "@/features/documents/queries";
import { fullName } from "@/features/residents/format";
import { getAdmissionByResident, getResident } from "@/features/residents/queries";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { privateFileUrl } from "@/lib/storage/links";
import { formatDateTime } from "@/lib/time/format";

import { RemoveFileButton } from "./remove-file-button";

export const metadata: Metadata = { title: "Documento del legajo" };

/**
 * Visor de un documento del legajo (F.6: visor auditado y reemplazo). Cada
 * foto llega por un enlace de 5 minutos y cada apertura queda registrada.
 */
export default async function LegajoDocumentPage({
  params,
}: PageProps<"/pacientes/[id]/legajo/[typeId]">) {
  const context = await requirePermission("documents.files");
  const { id, typeId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(typeId).success) notFound();

  const { site } = await getSiteContext(context);
  const data = await inTenant(context, async (tx) => {
    const resident = await getResident(tx, id);
    if (!resident) return null;
    const [type] = await tx
      .select()
      .from(schema.documentTypes)
      .where(eq(schema.documentTypes.id, typeId));
    if (!type) return null;
    return {
      resident,
      type,
      document: (await listResidentDocuments(tx, id)).get(typeId),
      admission: await getAdmissionByResident(tx, id),
    };
  });
  if (!data) notFound();
  const { resident, type, document, admission } = data;
  const editable = ["admission_draft", "active", "hospitalized"].includes(resident.status);
  const back: { href: Route; label: string } =
    resident.status === "admission_draft" && admission
      ? {
          href: `/ingresos/${admission.id}/documentos` as Route,
          label: "Documentación del ingreso",
        }
      : { href: `/pacientes/${id}?tab=legajo` as Route, label: "Legajo" };
  const files = document?.files ?? [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader title={type.name} description={fullName(resident)} back={back} />
      <Notice tone="info">
        Documentación privada: cada vez que se abre una foto queda registrado quién y cuándo.
      </Notice>
      {files.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay archivos cargados.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {files.map((file, index) => {
            const url = privateFileUrl(file.fileId, context.user.id);
            return (
              <li key={file.id} className="flex flex-col gap-3 rounded-[14px] border bg-card p-3">
                {file.mimeType === "application/pdf" ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-muted p-4 font-medium text-primary-ink"
                  >
                    <FileText aria-hidden="true" className="size-5" />
                    Abrir el PDF
                  </a>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- archivo privado con enlace temporal: sin optimizar ni cachear
                  <img
                    src={url}
                    alt={`${type.name}, archivo ${index + 1}`}
                    className="max-h-[70vh] w-full rounded-lg bg-muted object-contain"
                  />
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <span className="text-[13px] text-muted-foreground">
                    Cargado {formatDateTime(file.createdAt, site.timezone)}
                    {file.addedByName ? ` por ${file.addedByName}` : ""}
                  </span>
                  {editable ? (
                    <RemoveFileButton
                      action={removeDocumentFileAction.bind(null, id, file.fileId)}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {editable ? (
        <div className="rounded-[14px] border bg-card p-4">
          <DocumentUploader upload={uploadDocumentFileAction.bind(null, id, typeId)} />
        </div>
      ) : null}
    </div>
  );
}
