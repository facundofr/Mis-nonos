import { and, eq, isNull, max } from "drizzle-orm";

import * as schema from "@/db/schema";
import { recordAudit } from "@/lib/audit";
import type { Transaction } from "@/lib/db/client";
import type { TenantContext } from "@/lib/db/tenant";
import { DomainError } from "@/lib/errors";

/*
 * Legajo documental (7.3-C2, 12.7). El archivo ya está guardado en el
 * almacenamiento privado; acá se registra y se vincula al documento, en la
 * misma transacción que la auditoría. Si la transacción falla, el archivo
 * queda huérfano en el disco (sin datos que lo vinculen) y no se muestra.
 */

export interface StoredFile {
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
}

const OPEN_STATUSES = ["admission_draft", "active", "hospitalized"];

async function requireResidentAndType(tx: Transaction, residentId: string, documentTypeId: string) {
  const [resident] = await tx
    .select({
      id: schema.residents.id,
      siteId: schema.residents.siteId,
      status: schema.residents.status,
    })
    .from(schema.residents)
    .where(eq(schema.residents.id, residentId));
  if (!resident) throw new DomainError("Ese paciente no existe.");
  if (!OPEN_STATUSES.includes(resident.status)) {
    throw new DomainError("El legajo de un paciente egresado ya no se modifica.");
  }
  const [type] = await tx
    .select({ id: schema.documentTypes.id, name: schema.documentTypes.name })
    .from(schema.documentTypes)
    .where(and(eq(schema.documentTypes.id, documentTypeId), eq(schema.documentTypes.active, true)));
  if (!type) throw new DomainError("Ese documento no existe.");
  return { resident, type };
}

/** Agrega una foto o PDF a un documento del legajo. */
export async function attachDocumentFile(
  tx: Transaction,
  actor: TenantContext,
  input: { residentId: string; documentTypeId: string; file: StoredFile },
): Promise<{ fileId: string }> {
  const { resident, type } = await requireResidentAndType(
    tx,
    input.residentId,
    input.documentTypeId,
  );

  await tx
    .insert(schema.residentDocuments)
    .values({
      organizationId: actor.organizationId,
      residentId: resident.id,
      documentTypeId: type.id,
      createdBy: actor.userId,
    })
    .onConflictDoNothing({
      target: [schema.residentDocuments.residentId, schema.residentDocuments.documentTypeId],
    });
  const [document] = await tx
    .select({ id: schema.residentDocuments.id })
    .from(schema.residentDocuments)
    .where(
      and(
        eq(schema.residentDocuments.residentId, resident.id),
        eq(schema.residentDocuments.documentTypeId, type.id),
      ),
    );
  if (!document) throw new Error("No se pudo crear el documento.");

  const [file] = await tx
    .insert(schema.files)
    .values({
      organizationId: actor.organizationId,
      siteId: resident.siteId,
      ...input.file,
      uploadedBy: actor.userId,
    })
    .returning({ id: schema.files.id });
  if (!file) throw new Error("No se pudo registrar el archivo.");

  const [last] = await tx
    .select({ value: max(schema.residentDocumentFiles.position) })
    .from(schema.residentDocumentFiles)
    .where(eq(schema.residentDocumentFiles.documentId, document.id));
  await tx.insert(schema.residentDocumentFiles).values({
    organizationId: actor.organizationId,
    documentId: document.id,
    fileId: file.id,
    position: (last?.value ?? 0) + 1,
    addedBy: actor.userId,
  });

  await recordAudit(tx, actor, {
    action: "resident.document_uploaded",
    entityType: "resident",
    entityId: resident.id,
    siteId: resident.siteId,
    metadata: { documento: type.name, fileId: file.id, tipo: input.file.mimeType },
  });
  return { fileId: file.id };
}

/** Quita una foto del documento: queda marcada como reemplazada, no se borra. */
export async function removeDocumentFile(
  tx: Transaction,
  actor: TenantContext,
  residentId: string,
  fileId: string,
): Promise<void> {
  const [link] = await tx
    .select({
      id: schema.residentDocumentFiles.id,
      documentTypeName: schema.documentTypes.name,
      status: schema.residents.status,
      siteId: schema.residents.siteId,
    })
    .from(schema.residentDocumentFiles)
    .innerJoin(
      schema.residentDocuments,
      eq(schema.residentDocuments.id, schema.residentDocumentFiles.documentId),
    )
    .innerJoin(
      schema.documentTypes,
      eq(schema.documentTypes.id, schema.residentDocuments.documentTypeId),
    )
    .innerJoin(schema.residents, eq(schema.residents.id, schema.residentDocuments.residentId))
    .where(
      and(
        eq(schema.residentDocumentFiles.fileId, fileId),
        eq(schema.residentDocuments.residentId, residentId),
        isNull(schema.residentDocumentFiles.replacedAt),
      ),
    );
  if (!link) throw new DomainError("Esa foto ya no está en el legajo.");
  if (!OPEN_STATUSES.includes(link.status)) {
    throw new DomainError("El legajo de un paciente egresado ya no se modifica.");
  }
  await tx
    .update(schema.residentDocumentFiles)
    .set({ replacedAt: new Date(), replacedBy: actor.userId })
    .where(eq(schema.residentDocumentFiles.id, link.id));
  await recordAudit(tx, actor, {
    action: "resident.document_file_removed",
    entityType: "resident",
    entityId: residentId,
    siteId: link.siteId,
    metadata: { documento: link.documentTypeName, fileId },
  });
}

/** Cada apertura de una foto del legajo queda en la auditoría (12.7). */
export async function recordDocumentView(
  tx: Transaction,
  actor: TenantContext,
  input: { residentId: string; siteId: string; fileId: string; documentTypeName: string },
): Promise<void> {
  await recordAudit(tx, actor, {
    action: "resident.document_viewed",
    entityType: "resident",
    entityId: input.residentId,
    siteId: input.siteId,
    metadata: { documento: input.documentTypeName, fileId: input.fileId },
  });
}
