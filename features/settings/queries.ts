import { asc } from "drizzle-orm";

import * as schema from "@/db/schema";
import type { Transaction } from "@/lib/db/client";

export type NoteCategoryRow = typeof schema.noteCategories.$inferSelect;
export type DocumentTypeRow = typeof schema.documentTypes.$inferSelect;

export function listNoteCategories(tx: Transaction): Promise<NoteCategoryRow[]> {
  return tx
    .select()
    .from(schema.noteCategories)
    .orderBy(asc(schema.noteCategories.position), asc(schema.noteCategories.createdAt));
}

export function listDocumentTypes(tx: Transaction): Promise<DocumentTypeRow[]> {
  return tx
    .select()
    .from(schema.documentTypes)
    .orderBy(asc(schema.documentTypes.position), asc(schema.documentTypes.createdAt));
}

export function listModules(tx: Transaction) {
  return tx
    .select({
      moduleKey: schema.organizationModules.moduleKey,
      enabled: schema.organizationModules.enabled,
    })
    .from(schema.organizationModules);
}
