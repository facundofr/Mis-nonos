import { z } from "zod";

import { findLegajoFile } from "@/features/documents/queries";
import { recordDocumentView } from "@/features/documents/service";
import { can } from "@/lib/auth/authorization";
import { requireAppContext } from "@/lib/auth/session";
import { getDb, withTenant } from "@/lib/db";
import { logger } from "@/lib/logger/server";
import { getFileLinkKey, getStorage } from "@/lib/storage";
import { verifyFileLink } from "@/lib/storage/signing";

/*
 * Entrega un archivo privado del legajo (10.5, 12.7). En cada pedido:
 * 1. sesión vigente en la residencia (sin ella, va al ingreso);
 * 2. permiso documents.files (solo Administración y Dirección);
 * 3. enlace temporal firmado para este archivo y esta persona;
 * 4. el archivo es de la residencia activa (RLS);
 * 5. la apertura queda en la auditoría.
 * Nunca se cachea ni se comparte entre personas.
 */

const NO_STORE = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

function denied(status: 403 | 404) {
  return new Response(status === 403 ? "Sin permiso" : "No encontrado", {
    status,
    headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET(request: Request, { params }: RouteContext<"/api/archivos/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return denied(404);

  const context = await requireAppContext();
  if (!(await can(context, "documents.files"))) return denied(403);

  const token = new URL(request.url).searchParams.get("t") ?? "";
  if (!verifyFileLink({ key: getFileLinkKey(), token, fileId: id, userId: context.user.id })) {
    return denied(403);
  }

  const file = await withTenant(getDb(), context.tenant, async (tx) => {
    const found = await findLegajoFile(tx, id);
    if (found) {
      await recordDocumentView(tx, context.tenant, {
        residentId: found.residentId,
        siteId: found.siteId,
        fileId: found.fileId,
        documentTypeName: found.documentTypeName,
      });
    }
    return found;
  });
  if (!file) return denied(404);

  const bytes = await getStorage().get(file.storageKey);
  if (!bytes) {
    logger.error({ fileId: file.fileId }, "Falta en el almacenamiento un archivo registrado");
    return denied(404);
  }
  return new Response(new Blob([bytes as BlobPart], { type: file.mimeType }), {
    headers: {
      ...NO_STORE,
      "Content-Type": file.mimeType,
      "Content-Disposition": "inline",
      // Un PDF se abre aislado: sin scripts ni acceso a la app.
      "Content-Security-Policy":
        "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
