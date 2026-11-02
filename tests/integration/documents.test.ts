import { createHash, randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import * as schema from "@/db/schema";
import { findLegajoFile, listResidentDocuments } from "@/features/documents/queries";
import { attachDocumentFile, removeDocumentFile } from "@/features/documents/service";
import { residentDataSchema } from "@/features/residents/schemas";
import { startAdmission } from "@/features/residents/service";
import { createDb, createPool } from "@/lib/db/client";
import { withTenant, type TenantContext } from "@/lib/db/tenant";
import { createOrganization } from "@/lib/organizations/create";
import { newStorageKey } from "@/lib/storage/keys";

// Etapa 3.2: legajo documental (F1-ING-04, 12.7) contra PostgreSQL real.

const { ownerUrl, appUrl } = inject("databaseUrls");
const ownerPool = createPool(ownerUrl, { application_name: "pruebas-legajo-dueno" });
const appPool = createPool(appUrl, { application_name: "pruebas-legajo-app" });
const owner = createDb(ownerPool);
const app = createDb(appPool);

interface Org {
  siteId: string;
  actor: TenantContext;
  residentId: string;
  dniTypeId: string;
}

async function setup(name: string): Promise<Org> {
  const created = await owner.transaction((tx) =>
    createOrganization(tx, {
      organizationName: name,
      siteName: "Sede central",
      adminEmail: `admin-${randomUUID()}@prueba.test`,
      adminName: "Administración",
    }),
  );
  const [user] = await owner
    .insert(schema.users)
    .values({ name: "Laura Pereyra", email: `laura-${randomUUID()}@prueba.test` })
    .returning({ id: schema.users.id });
  const actor = { organizationId: created.organizationId, userId: user!.id };
  const [dni] = await owner
    .select({ id: schema.documentTypes.id })
    .from(schema.documentTypes)
    .where(
      and(
        eq(schema.documentTypes.organizationId, created.organizationId),
        eq(schema.documentTypes.key, "dni_custodia"),
      ),
    );
  const { residentId } = await withTenant(app, actor, (tx) =>
    startAdmission(
      tx,
      actor,
      created.siteId,
      residentDataSchema.parse({
        firstName: "Rosa",
        lastName: "Medina",
        admissionDate: "2026-10-14",
        admissionModality: "private",
        coverageType: "none",
      }),
    ),
  );
  return { siteId: created.siteId, actor, residentId, dniTypeId: dni!.id };
}

const storedFile = (organizationId: string) => ({
  storageKey: newStorageKey(organizationId),
  mimeType: "image/jpeg",
  sizeBytes: 1234,
  sha256: createHash("sha256").update(randomUUID()).digest("hex"),
});

let orgA: Org;
let orgB: Org;

beforeAll(async () => {
  orgA = await setup("Residencia A (legajo)");
  orgB = await setup("Residencia B (legajo)");
});

afterAll(async () => {
  await Promise.all([ownerPool.end(), appPool.end()]);
});

describe("Legajo documental", () => {
  it("varias fotos por documento, en orden; quitar una no la borra", async () => {
    const inA = <T>(fn: Parameters<typeof withTenant<T>>[2]) => withTenant(app, orgA.actor, fn);
    const front = await inA((tx) =>
      attachDocumentFile(tx, orgA.actor, {
        residentId: orgA.residentId,
        documentTypeId: orgA.dniTypeId,
        file: storedFile(orgA.actor.organizationId),
      }),
    );
    await inA((tx) =>
      attachDocumentFile(tx, orgA.actor, {
        residentId: orgA.residentId,
        documentTypeId: orgA.dniTypeId,
        file: storedFile(orgA.actor.organizationId),
      }),
    );
    let documents = await inA((tx) => listResidentDocuments(tx, orgA.residentId));
    expect(documents.get(orgA.dniTypeId)?.files).toHaveLength(2);

    await inA((tx) => removeDocumentFile(tx, orgA.actor, orgA.residentId, front.fileId));
    documents = await inA((tx) => listResidentDocuments(tx, orgA.residentId));
    expect(documents.get(orgA.dniTypeId)?.files).toHaveLength(1);
    const kept = await owner
      .select()
      .from(schema.residentDocumentFiles)
      .where(eq(schema.residentDocumentFiles.fileId, front.fileId));
    expect(kept[0]?.replacedAt).toBeInstanceOf(Date);
    expect(await inA((tx) => findLegajoFile(tx, front.fileId))).toBeNull();
  });

  it("una residencia no puede ver los archivos de otra", async () => {
    const { fileId } = await withTenant(app, orgB.actor, (tx) =>
      attachDocumentFile(tx, orgB.actor, {
        residentId: orgB.residentId,
        documentTypeId: orgB.dniTypeId,
        file: storedFile(orgB.actor.organizationId),
      }),
    );
    expect(await withTenant(app, orgB.actor, (tx) => findLegajoFile(tx, fileId))).not.toBeNull();
    expect(await withTenant(app, orgA.actor, (tx) => findLegajoFile(tx, fileId))).toBeNull();
    const rows = await withTenant(app, orgA.actor, (tx) =>
      tx.select().from(schema.files).where(eq(schema.files.id, fileId)),
    );
    expect(rows).toEqual([]);
  });

  it("los archivos son inmutables para la app: no se modifican ni se borran", async () => {
    const [anyFile] = await owner
      .select({ id: schema.files.id })
      .from(schema.files)
      .where(eq(schema.files.organizationId, orgA.actor.organizationId));
    for (const operation of [
      withTenant(app, orgA.actor, (tx) =>
        tx.update(schema.files).set({ sizeBytes: 1 }).where(eq(schema.files.id, anyFile!.id)),
      ),
      withTenant(app, orgA.actor, (tx) =>
        tx.delete(schema.files).where(eq(schema.files.id, anyFile!.id)),
      ),
    ]) {
      const code = await operation.then(
        () => "sin error",
        (error: { cause?: { code?: string } }) => error.cause?.code,
      );
      expect(code).toBe("42501");
    }
    const stillThere = await owner
      .select({ id: schema.files.id })
      .from(schema.files)
      .where(and(eq(schema.files.id, anyFile!.id), isNull(schema.files.uploadedBy)));
    expect(stillThere).toEqual([]);
  });
});
