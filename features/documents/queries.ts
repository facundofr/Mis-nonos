import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";

import * as schema from "@/db/schema";
import type { Transaction } from "@/lib/db/client";

export interface DocumentFileItem {
  /** Id de la relación documento-archivo (para quitarla). */
  id: string;
  fileId: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
  addedByName: string | null;
}

export interface ResidentDocumentItem {
  documentId: string;
  documentTypeId: string;
  signedOn: string | null;
  files: DocumentFileItem[];
}

/** Documentos cargados de un paciente, con sus archivos vigentes. */
export async function listResidentDocuments(
  tx: Transaction,
  residentId: string,
): Promise<Map<string, ResidentDocumentItem>> {
  const documents = await tx
    .select()
    .from(schema.residentDocuments)
    .where(eq(schema.residentDocuments.residentId, residentId));
  const result = new Map<string, ResidentDocumentItem>();
  if (documents.length === 0) return result;

  const fileRows = await tx
    .select({
      id: schema.residentDocumentFiles.id,
      documentId: schema.residentDocumentFiles.documentId,
      fileId: schema.files.id,
      mimeType: schema.files.mimeType,
      sizeBytes: schema.files.sizeBytes,
      createdAt: schema.residentDocumentFiles.createdAt,
      addedByName: schema.users.name,
    })
    .from(schema.residentDocumentFiles)
    .innerJoin(schema.files, eq(schema.files.id, schema.residentDocumentFiles.fileId))
    .leftJoin(schema.users, eq(schema.users.id, schema.residentDocumentFiles.addedBy))
    .where(
      and(
        inArray(
          schema.residentDocumentFiles.documentId,
          documents.map((document) => document.id),
        ),
        isNull(schema.residentDocumentFiles.replacedAt),
      ),
    )
    .orderBy(asc(schema.residentDocumentFiles.position));

  for (const document of documents) {
    result.set(document.documentTypeId, {
      documentId: document.id,
      documentTypeId: document.documentTypeId,
      signedOn: document.signedOn,
      files: fileRows
        .filter((row) => row.documentId === document.id)
        .map(({ documentId: _documentId, ...file }) => file),
    });
  }
  return result;
}

/** Tipos de documento con al menos un archivo vigente (para calcular faltantes). */
export function uploadedTypeIds(documents: Map<string, ResidentDocumentItem>): Set<string> {
  return new Set(
    [...documents.values()]
      .filter((document) => document.files.length > 0)
      .map((document) => document.documentTypeId),
  );
}

/** Un archivo vigente del legajo, para entregarlo (ruta /api/archivos). */
export async function findLegajoFile(tx: Transaction, fileId: string) {
  const [row] = await tx
    .select({
      fileId: schema.files.id,
      storageKey: schema.files.storageKey,
      mimeType: schema.files.mimeType,
      siteId: schema.files.siteId,
      residentId: schema.residentDocuments.residentId,
      documentTypeName: schema.documentTypes.name,
    })
    .from(schema.residentDocumentFiles)
    .innerJoin(schema.files, eq(schema.files.id, schema.residentDocumentFiles.fileId))
    .innerJoin(
      schema.residentDocuments,
      eq(schema.residentDocuments.id, schema.residentDocumentFiles.documentId),
    )
    .innerJoin(
      schema.documentTypes,
      eq(schema.documentTypes.id, schema.residentDocuments.documentTypeId),
    )
    .where(
      and(
        eq(schema.residentDocumentFiles.fileId, fileId),
        isNull(schema.residentDocumentFiles.replacedAt),
      ),
    );
  return row ?? null;
}

export interface MissingDocumentsItem {
  residentId: string;
  firstName: string;
  lastName: string;
  missing: number;
}

/**
 * Pacientes activos o internados fuera a los que les faltan documentos
 * obligatorios de su modalidad (Inicio de Administración y Dirección, F.6).
 */
export async function residentsWithMissingDocuments(
  tx: Transaction,
  limit = 5,
): Promise<{ items: MissingDocumentsItem[]; total: number }> {
  const result = await tx.execute<{
    resident_id: string;
    first_name: string;
    last_name: string;
    missing: number;
    total: number;
  }>(sql`
    select r.id as resident_id, r.first_name, r.last_name,
           count(dt.id)::int as missing,
           count(*) over ()::int as total
    from residents r
    join document_types dt
      on dt.organization_id = r.organization_id
     and dt.active and dt.required
     and (dt.required_for = 'all' or dt.required_for = r.admission_modality)
    where r.status in ('active', 'hospitalized')
      and not exists (
        select 1
        from resident_documents d
        join resident_document_files f on f.document_id = d.id and f.replaced_at is null
        where d.resident_id = r.id and d.document_type_id = dt.id
      )
    group by r.id, r.first_name, r.last_name
    order by missing desc, r.last_name, r.first_name
    limit ${limit}
  `);
  return {
    items: result.rows.map((row) => ({
      residentId: row.resident_id,
      firstName: row.first_name,
      lastName: row.last_name,
      missing: row.missing,
    })),
    total: result.rows[0]?.total ?? 0,
  };
}
