import { randomUUID } from "node:crypto";

import { and, eq, isNull, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import * as schema from "@/db/schema";
import { listEntityActivity } from "@/features/activity/queries";
import { countPendingNotes, getNote, listNotes, listNoteVersions } from "@/features/notes/queries";
import { noteSchema } from "@/features/notes/schemas";
import { correctNote, createNote, resolveNote } from "@/features/notes/service";
import { residentDataSchema } from "@/features/residents/schemas";
import { startAdmission } from "@/features/residents/service";
import { createDb, createPool } from "@/lib/db/client";
import { withTenant, type TenantContext } from "@/lib/db/tenant";
import { DomainError } from "@/lib/errors";
import { createOrganization } from "@/lib/organizations/create";

// Etapa 3.4: novedades (7.3-F, F.4). Datos ficticios.

const { ownerUrl, appUrl } = inject("databaseUrls");
const ownerPool = createPool(ownerUrl, { application_name: "pruebas-novedades-dueno" });
const appPool = createPool(appUrl, { application_name: "pruebas-novedades-app" });
const owner = createDb(ownerPool);
const app = createDb(appPool);

interface Org {
  siteId: string;
  author: TenantContext;
  other: TenantContext;
  categoryId: string;
  residentId: string;
}

async function member(organizationId: string, name: string): Promise<string> {
  const [user] = await owner
    .insert(schema.users)
    .values({ name, email: `${randomUUID()}@prueba.test` })
    .returning({ id: schema.users.id });
  const [role] = await owner
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .where(and(eq(schema.roles.key, "profesional"), isNull(schema.roles.organizationId)));
  await owner
    .insert(schema.organizationMemberships)
    .values({ organizationId, userId: user!.id, roleId: role!.id });
  return user!.id;
}

async function setupOrg(name: string): Promise<Org> {
  const created = await owner.transaction((tx) =>
    createOrganization(tx, {
      organizationName: name,
      siteName: "Sede central",
      adminEmail: `admin-${randomUUID()}@prueba.test`,
      adminName: "Administración",
    }),
  );
  const organizationId = created.organizationId;
  const author: TenantContext = {
    organizationId,
    userId: await member(organizationId, "Marta Gómez"),
  };
  const other: TenantContext = {
    organizationId,
    userId: await member(organizationId, "Jorge Suárez"),
  };
  const [category] = await owner
    .select({ id: schema.noteCategories.id })
    .from(schema.noteCategories)
    .where(
      and(
        eq(schema.noteCategories.organizationId, organizationId),
        eq(schema.noteCategories.name, "Alimentación"),
      ),
    );
  const { residentId } = await withTenant(app, author, (tx) =>
    startAdmission(
      tx,
      author,
      created.siteId,
      residentDataSchema.parse({
        firstName: "Héctor",
        lastName: "Benítez",
        admissionDate: "2026-10-14",
        admissionModality: "private",
        coverageType: "none",
      }),
    ),
  );
  // Ingreso confirmado: el paciente queda activo.
  await owner
    .update(schema.residents)
    .set({ status: "active" })
    .where(eq(schema.residents.id, residentId));
  return { siteId: created.siteId, author, other, categoryId: category!.id, residentId };
}

let orgA: Org;
let orgB: Org;

const note = (org: Org, overrides: Partial<{ content: string; followUp: string }> = {}) =>
  noteSchema.parse({ categoryId: org.categoryId, content: "No quiso almorzar.", ...overrides });

function errorCode(promise: Promise<unknown>): Promise<string | undefined> {
  return promise.then(
    () => "sin error",
    (error: { cause?: { code?: string } }) => error.cause?.code,
  );
}

beforeAll(async () => {
  [orgA, orgB] = await Promise.all([
    setupOrg("Residencia A (novedades)"),
    setupOrg("Residencia B (novedades)"),
  ]);
});

afterAll(async () => {
  await Promise.all([ownerPool.end(), appPool.end()]);
});

describe("Novedades", () => {
  it("se registra con versión 1, aparece en pendientes y en la actividad del paciente", async () => {
    const noteId = await withTenant(app, orgA.author, (tx) =>
      createNote(tx, orgA.author, {
        ...note(orgA, { followUp: "on" }),
        residentId: orgA.residentId,
        siteId: orgA.siteId,
      }),
    );
    const result = await withTenant(app, orgA.other, async (tx) => ({
      pending: await listNotes(tx, { siteId: orgA.siteId, view: "pendientes" }),
      count: await countPendingNotes(tx, orgA.siteId),
      versions: await listNoteVersions(tx, noteId),
      activity: await listEntityActivity(tx, { type: "resident", id: orgA.residentId }),
    }));
    expect(result.pending.map((item) => item.id)).toContain(noteId);
    expect(result.count).toBeGreaterThanOrEqual(1);
    expect(result.versions).toHaveLength(1);
    expect(result.activity.map((item) => item.action)).toContain("note.created");
    // La auditoría no copia el texto de la novedad.
    expect(JSON.stringify(result.activity)).not.toContain("almorzar");
  });

  it("General: sin paciente, en la sede de quien la registra", async () => {
    const noteId = await withTenant(app, orgA.author, (tx) =>
      createNote(tx, orgA.author, {
        ...note(orgA, { content: "Faltan guantes en el office." }),
        residentId: null,
        siteId: orgA.siteId,
      }),
    );
    const saved = await withTenant(app, orgA.author, (tx) => getNote(tx, noteId));
    expect(saved).toMatchObject({ residentId: null, siteId: orgA.siteId, followUp: false });
  });

  it("solo el autor corrige; cada corrección es una versión nueva y la anterior se conserva", async () => {
    const noteId = await withTenant(app, orgA.author, (tx) =>
      createNote(tx, orgA.author, {
        ...note(orgA),
        residentId: orgA.residentId,
        siteId: orgA.siteId,
      }),
    );
    await expect(
      withTenant(app, orgA.other, (tx) =>
        correctNote(tx, orgA.other, noteId, 1, note(orgA, { content: "Otro texto" })),
      ),
    ).rejects.toThrow("Solo quien registró la novedad puede corregirla.");

    await withTenant(app, orgA.author, (tx) =>
      correctNote(
        tx,
        orgA.author,
        noteId,
        1,
        note(orgA, { content: "No quiso almorzar ni cenar." }),
      ),
    );
    // Una corrección con la versión vieja no pisa la nueva.
    await expect(
      withTenant(app, orgA.author, (tx) =>
        correctNote(tx, orgA.author, noteId, 1, note(orgA, { content: "Pisada" })),
      ),
    ).rejects.toBeInstanceOf(DomainError);

    const versions = await withTenant(app, orgA.author, (tx) => listNoteVersions(tx, noteId));
    expect(versions.map((version) => [version.version, version.content])).toEqual([
      [2, "No quiso almorzar ni cenar."],
      [1, "No quiso almorzar."],
    ]);
  });

  it("después de 24 h ya no se puede corregir", async () => {
    const noteId = await withTenant(app, orgA.author, (tx) =>
      createNote(tx, orgA.author, {
        ...note(orgA),
        residentId: orgA.residentId,
        siteId: orgA.siteId,
      }),
    );
    await owner
      .update(schema.residentNotes)
      .set({ createdAt: sql`now() - interval '25 hours'` })
      .where(eq(schema.residentNotes.id, noteId));
    await expect(
      withTenant(app, orgA.author, (tx) =>
        correctNote(tx, orgA.author, noteId, 1, note(orgA, { content: "Tarde" })),
      ),
    ).rejects.toThrow(/más de 24 h/);
  });

  it("resuelve cualquiera, con comentario opcional, una sola vez", async () => {
    const noteId = await withTenant(app, orgA.author, (tx) =>
      createNote(tx, orgA.author, {
        ...note(orgA, { followUp: "on" }),
        residentId: orgA.residentId,
        siteId: orgA.siteId,
      }),
    );
    await withTenant(app, orgA.other, (tx) =>
      resolveNote(tx, orgA.other, noteId, { resolutionNote: "Se avisó a la hija." }),
    );
    await expect(
      withTenant(app, orgA.other, (tx) =>
        resolveNote(tx, orgA.other, noteId, { resolutionNote: null }),
      ),
    ).rejects.toThrow("Ese seguimiento ya estaba resuelto.");
    const saved = await withTenant(app, orgA.author, (tx) => getNote(tx, noteId));
    expect(saved).toMatchObject({
      resolvedByName: "Jorge Suárez",
      resolutionNote: "Se avisó a la hija.",
    });
    // Resuelta: el autor ya no la corrige.
    await expect(
      withTenant(app, orgA.author, (tx) =>
        correctNote(tx, orgA.author, noteId, 1, note(orgA, { content: "Cambio" })),
      ),
    ).rejects.toThrow(/ya está resuelta/);
  });

  it("no se registran novedades de pacientes que no están activos", async () => {
    await owner
      .update(schema.residents)
      .set({ status: "admission_draft" })
      .where(eq(schema.residents.id, orgB.residentId));
    await expect(
      withTenant(app, orgB.author, (tx) =>
        createNote(tx, orgB.author, {
          ...note(orgB),
          residentId: orgB.residentId,
          siteId: orgB.siteId,
        }),
      ),
    ).rejects.toThrow(/no está activo/);
    await owner
      .update(schema.residents)
      .set({ status: "active" })
      .where(eq(schema.residents.id, orgB.residentId));
  });

  it("una residencia no ve ni registra novedades de otra", async () => {
    const asB = await withTenant(app, orgB.author, (tx) => listNotes(tx, { siteId: orgA.siteId }));
    expect(asB).toEqual([]);
    // Un paciente de A desde la sesión de B no existe.
    await expect(
      withTenant(app, orgB.author, (tx) =>
        createNote(tx, orgB.author, {
          ...note(orgB),
          residentId: orgA.residentId,
          siteId: orgB.siteId,
        }),
      ),
    ).rejects.toThrow(/no está activo/);
  });

  it("la app no puede borrar novedades, tocar versiones ni cambiar el autor", async () => {
    const noteId = await withTenant(app, orgA.author, (tx) =>
      createNote(tx, orgA.author, { ...note(orgA), residentId: null, siteId: orgA.siteId }),
    );
    for (const operation of [
      () =>
        withTenant(app, orgA.author, (tx) =>
          tx.delete(schema.residentNotes).where(eq(schema.residentNotes.id, noteId)),
        ),
      () =>
        withTenant(app, orgA.author, (tx) =>
          tx
            .update(schema.residentNotes)
            .set({ createdBy: orgA.other.userId })
            .where(eq(schema.residentNotes.id, noteId)),
        ),
      () =>
        withTenant(app, orgA.author, (tx) =>
          tx
            .update(schema.noteVersions)
            .set({ content: "reescrita" })
            .where(eq(schema.noteVersions.noteId, noteId)),
        ),
      () =>
        withTenant(app, orgA.author, (tx) =>
          tx.delete(schema.noteVersions).where(eq(schema.noteVersions.noteId, noteId)),
        ),
    ]) {
      expect(await errorCode(operation())).toBe("42501");
    }
  });
});
