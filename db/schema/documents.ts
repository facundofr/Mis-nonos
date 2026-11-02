import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { appRole, createdAt, primaryId, tenantPolicies, updatedAt } from "./_shared";
import { users } from "./auth";
import { documentTypes } from "./catalogs";
import { residents } from "./residents";
import { organizations, sites } from "./tenancy";

/*
 * Legajo documental (7.3-C2, F.5, 12.7). Los archivos están en el
 * almacenamiento privado (lib/storage); acá van sus datos. Nada se borra:
 * una foto que se quita o se reemplaza queda marcada (replaced_at) y sigue
 * en el historial.
 */

/** Archivos guardados (F.5). Inmutables: la app solo los crea y los lee. */
export const files = pgTable(
  "files",
  {
    id: primaryId(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    siteId: uuid("site_id").notNull(),
    // Clave en el almacenamiento: residencia/año/mes/aleatorio (lib/storage/keys.ts).
    storageKey: text("storage_key").notNull().unique("files_storage_key_unique"),
    // Tipo real, detectado por los primeros bytes (no por la extensión).
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("files_organization_idx").on(t.organizationId, t.createdAt),
    unique("files_id_organization_unique").on(t.id, t.organizationId),
    foreignKey({
      name: "files_site_organization_fk",
      columns: [t.siteId, t.organizationId],
      foreignColumns: [sites.id, sites.organizationId],
    }).onDelete("restrict"),
    check(
      "files_mime_type_check",
      sql`${t.mimeType} in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')`,
    ),
    check("files_size_check", sql`${t.sizeBytes} > 0 and ${t.sizeBytes} <= 10485760`),
    check("files_sha256_check", sql`${t.sha256} ~ '^[0-9a-f]{64}$'`),
    pgPolicy("files_select", {
      for: "select",
      to: appRole,
      using: sql`organization_id = (select app.current_org_id())`,
    }),
    pgPolicy("files_insert", {
      for: "insert",
      to: appRole,
      withCheck: sql`organization_id = (select app.current_org_id())`,
    }),
  ],
);

/** Un documento del legajo de un paciente (uno por tipo). */
export const residentDocuments = pgTable(
  "resident_documents",
  {
    id: primaryId(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    residentId: uuid("resident_id").notNull(),
    documentTypeId: uuid("document_type_id").notNull(),
    // Fecha en que se firmó en papel, si corresponde.
    signedOn: date("signed_on"),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("resident_documents_resident_type_unique").on(t.residentId, t.documentTypeId),
    unique("resident_documents_id_organization_unique").on(t.id, t.organizationId),
    foreignKey({
      name: "resident_documents_resident_organization_fk",
      columns: [t.residentId, t.organizationId],
      foreignColumns: [residents.id, residents.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "resident_documents_type_organization_fk",
      columns: [t.documentTypeId, t.organizationId],
      foreignColumns: [documentTypes.id, documentTypes.organizationId],
    }).onDelete("restrict"),
    ...tenantPolicies("resident_documents"),
  ],
);

/** Fotos o PDF de un documento: varias por documento (DNI frente y dorso, F.5). */
export const residentDocumentFiles = pgTable(
  "resident_document_files",
  {
    id: primaryId(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    documentId: uuid("document_id").notNull(),
    fileId: uuid("file_id").notNull(),
    position: integer("position").notNull(),
    addedBy: uuid("added_by").references(() => users.id, { onDelete: "restrict" }),
    // Quitada o reemplazada: deja de mostrarse, pero no se borra.
    replacedAt: timestamp("replaced_at", { withTimezone: true }),
    replacedBy: uuid("replaced_by").references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("resident_document_files_document_idx").on(t.documentId, t.position),
    uniqueIndex("resident_document_files_file_unique").on(t.fileId),
    foreignKey({
      name: "resident_document_files_document_organization_fk",
      columns: [t.documentId, t.organizationId],
      foreignColumns: [residentDocuments.id, residentDocuments.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "resident_document_files_file_organization_fk",
      columns: [t.fileId, t.organizationId],
      foreignColumns: [files.id, files.organizationId],
    }).onDelete("restrict"),
    check(
      "resident_document_files_replaced_check",
      sql`(${t.replacedAt} is null) = (${t.replacedBy} is null)`,
    ),
    ...tenantPolicies("resident_document_files"),
  ],
);
