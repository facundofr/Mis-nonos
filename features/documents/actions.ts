"use server";

import { createHash } from "node:crypto";

import { refresh } from "next/cache";
import { z } from "zod";

import { attachDocumentFile, removeDocumentFile } from "@/features/documents/service";
import { inTenant, runAction } from "@/lib/actions";
import type { FormState } from "@/lib/forms";
import { getStorage } from "@/lib/storage";
import { checkFile, fileCheckMessage } from "@/lib/storage/file-types";
import { newStorageKey } from "@/lib/storage/keys";

const id = z.uuid();

/**
 * Sube una foto o un PDF a un documento del legajo (F1-ING-04). Solo
 * Administración y Dirección (documents.files, 12.7). El tipo se valida por
 * el contenido, no por la extensión ni por lo que dice el navegador.
 */
export async function uploadDocumentFileAction(
  residentId: string,
  documentTypeId: string,
  formData: FormData,
): Promise<FormState> {
  if (!id.safeParse(residentId).success || !id.safeParse(documentTypeId).success) {
    return { error: "Documento inválido." };
  }
  const file = formData.get("archivo");
  if (!(file instanceof File)) return { error: "Elegí una foto o un PDF." };

  return runAction("documents.files", async (context) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const check = checkFile(bytes, ["image/jpeg", "image/png", "image/webp", "application/pdf"]);
    if (!check.ok) return { error: fileCheckMessage(check.reason) };

    const storageKey = newStorageKey(context.tenant.organizationId);
    await getStorage().put(storageKey, bytes);
    await inTenant(context, (tx) =>
      attachDocumentFile(tx, context.tenant, {
        residentId,
        documentTypeId,
        file: {
          storageKey,
          mimeType: check.mimeType,
          sizeBytes: bytes.byteLength,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        },
      }),
    );
    refresh();
    return { success: "Archivo guardado." };
  });
}

export async function removeDocumentFileAction(residentId: string, fileId: string): Promise<void> {
  if (!id.safeParse(residentId).success || !id.safeParse(fileId).success) return;
  await runAction("documents.files", async (context) => {
    await inTenant(context, (tx) => removeDocumentFile(tx, context.tenant, residentId, fileId));
    refresh();
    return null;
  });
}
