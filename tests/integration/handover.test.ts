import { randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import * as schema from "@/db/schema";
import { getHandover, handoverSummary, listHandoverVersions } from "@/features/handover/queries";
import { confirmHandover, deliverHandover } from "@/features/handover/service";
import { noteSchema } from "@/features/notes/schemas";
import { createNote, resolveNote } from "@/features/notes/service";
import { createDb, createPool } from "@/lib/db/client";
import { withTenant, type TenantContext } from "@/lib/db/tenant";
import { createOrganization } from "@/lib/organizations/create";
import { shiftOccurrenceOn } from "@/lib/time/shifts";

// Etapa 3.5: traspaso de turno (7.3-G, F.4). Datos ficticios.

const { ownerUrl, appUrl } = inject("databaseUrls");
const ownerPool = createPool(ownerUrl, { application_name: "pruebas-traspaso-dueno" });
const appPool = createPool(appUrl, { application_name: "pruebas-traspaso-app" });
const owner = createDb(ownerPool);
const app = createDb(appPool);

const TZ = "America/Argentina/Buenos_Aires";
const at = (local: string) => new Date(`${local}-03:00`);
// Un turno del pasado: los "ahora" de la prueba se pasan a mano.
const DAY = "2026-10-01";

let siteId: string;
let morning: typeof schema.shifts.$inferSelect;
let marta: TenantContext;
let jorge: TenantContext;
let other: TenantContext;

async function member(organizationId: string, name: string): Promise<string> {
  const [user] = await owner
    .insert(schema.users)
    .values({ name, email: `${randomUUID()}@prueba.test` })
    .returning({ id: schema.users.id });
  const [role] = await owner
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .where(and(eq(schema.roles.key, "cuidado"), isNull(schema.roles.organizationId)));
  await owner
    .insert(schema.organizationMemberships)
    .values({ organizationId, userId: user!.id, roleId: role!.id });
  return user!.id;
}

async function newOrg(name: string) {
  return owner.transaction((tx) =>
    createOrganization(tx, {
      organizationName: name,
      siteName: "Sede central",
      adminEmail: `admin-${randomUUID()}@prueba.test`,
      adminName: "Administración",
    }),
  );
}

const target = () => ({ siteId, shiftId: morning.id, shiftDate: DAY });

beforeAll(async () => {
  const created = await newOrg("Residencia (traspaso)");
  siteId = created.siteId;
  await owner.update(schema.sites).set({ timezone: TZ }).where(eq(schema.sites.id, siteId));
  const [found] = await owner
    .select()
    .from(schema.shifts)
    .where(and(eq(schema.shifts.siteId, siteId), eq(schema.shifts.name, "Mañana")));
  morning = found!;
  marta = {
    organizationId: created.organizationId,
    userId: await member(created.organizationId, "Marta Gómez"),
  };
  jorge = {
    organizationId: created.organizationId,
    userId: await member(created.organizationId, "Jorge Suárez"),
  };
  const otherOrg = await newOrg("Otra residencia (traspaso)");
  other = {
    organizationId: otherOrg.organizationId,
    userId: await member(otherOrg.organizationId, "Ana Paz"),
  };
});

afterAll(async () => {
  await Promise.all([ownerPool.end(), appPool.end()]);
});

describe("Traspaso de turno", () => {
  it("fuera de horario no se entrega", async () => {
    await expect(
      withTenant(app, marta, (tx) =>
        deliverHandover(
          tx,
          marta,
          { ...target(), note: null, expectedVersion: 0 },
          at(`${DAY}T12:30:00`),
        ),
      ),
    ).rejects.toThrow(/1 h antes hasta 2 h después/);
  });

  it("una entrega por turno; si otra persona la completa, es una versión nueva", async () => {
    await withTenant(app, marta, (tx) =>
      deliverHandover(
        tx,
        marta,
        { ...target(), note: "Héctor comió poco.", expectedVersion: 0 },
        at(`${DAY}T13:40:00`),
      ),
    );
    // Otra entrega "nueva" del mismo turno choca.
    await expect(
      withTenant(app, jorge, (tx) =>
        deliverHandover(
          tx,
          jorge,
          { ...target(), note: "Otra", expectedVersion: 0 },
          at(`${DAY}T13:50:00`),
        ),
      ),
    ).rejects.toThrow(/Alguien cambió estos datos/);
    await withTenant(app, jorge, (tx) =>
      deliverHandover(
        tx,
        jorge,
        { ...target(), note: "Héctor comió poco. Mirar la cena.", expectedVersion: 1 },
        at(`${DAY}T14:30:00`),
      ),
    );
    const { handover, versions } = await withTenant(app, marta, async (tx) => {
      const row = await getHandover(tx, siteId, morning.id, DAY);
      return { handover: row, versions: await listHandoverVersions(tx, row!.id) };
    });
    expect(handover).toMatchObject({ version: 2, deliveredByName: "Jorge Suárez" });
    expect(versions.map((item) => [item.version, item.deliveredByName])).toEqual([
      [2, "Jorge Suárez"],
      [1, "Marta Gómez"],
    ]);
  });

  it("la confirmación solo si la sede la pide; después ya no se cambia la entrega", async () => {
    await expect(
      withTenant(app, jorge, (tx) => confirmHandover(tx, jorge, target(), at(`${DAY}T15:00:00`))),
    ).rejects.toThrow(/no pide confirmar/);
    await owner
      .update(schema.sites)
      .set({ handoverRequiresConfirmation: true })
      .where(eq(schema.sites.id, siteId));
    // Terminado el turno entrante (tarde, hasta las 22), ya no se confirma.
    await expect(
      withTenant(app, jorge, (tx) => confirmHandover(tx, jorge, target(), at(`${DAY}T22:30:00`))),
    ).rejects.toThrow(/durante el turno entrante/);
    await withTenant(app, jorge, (tx) =>
      confirmHandover(tx, jorge, target(), at(`${DAY}T15:00:00`)),
    );
    await expect(
      withTenant(app, marta, (tx) =>
        deliverHandover(
          tx,
          marta,
          { ...target(), note: "Cambio", expectedVersion: 2 },
          at(`${DAY}T15:10:00`),
        ),
      ),
    ).rejects.toThrow(/ya confirmó/);
    const handover = await withTenant(app, marta, (tx) => getHandover(tx, siteId, morning.id, DAY));
    expect(handover?.confirmedByName).toBe("Jorge Suárez");
  });

  it("el resumen trae las novedades del turno y los pendientes al momento de la entrega", async () => {
    const [category] = await owner
      .select({ id: schema.noteCategories.id })
      .from(schema.noteCategories)
      .where(eq(schema.noteCategories.organizationId, marta.organizationId))
      .limit(1);
    const noteId = await withTenant(app, marta, (tx) =>
      createNote(tx, marta, {
        ...noteSchema.parse({
          categoryId: category!.id,
          content: "Reponer guantes.",
          followUp: "on",
        }),
        residentId: null,
        siteId,
      }),
    );
    await owner
      .update(schema.residentNotes)
      .set({ createdAt: at(`${DAY}T10:00:00`) })
      .where(eq(schema.residentNotes.id, noteId));
    // Se resuelve hoy: al momento de la entrega (el 01/10) seguía abierto.
    await withTenant(app, jorge, (tx) => resolveNote(tx, jorge, noteId, { resolutionNote: null }));

    const occurrence = shiftOccurrenceOn(morning, DAY, TZ);
    const summary = await withTenant(app, marta, async (tx) => {
      const handover = await getHandover(tx, siteId, morning.id, DAY);
      return handoverSummary(tx, siteId, occurrence, handover, new Date());
    });
    expect(summary.notes.map((item) => item.id)).toEqual([noteId]);
    expect(summary.pending.map((item) => item.id)).toEqual([noteId]);
  });

  it("otra residencia no ve el traspaso; la app no borra ni cambia el turno", async () => {
    expect(
      await withTenant(app, other, (tx) => getHandover(tx, siteId, morning.id, DAY)),
    ).toBeNull();
    for (const operation of [
      () =>
        withTenant(app, marta, (tx) =>
          tx.delete(schema.shiftHandovers).where(eq(schema.shiftHandovers.siteId, siteId)),
        ),
      () =>
        withTenant(app, marta, (tx) =>
          tx
            .update(schema.shiftHandovers)
            .set({ shiftDate: "2026-10-02" })
            .where(eq(schema.shiftHandovers.siteId, siteId)),
        ),
      () =>
        withTenant(app, marta, (tx) =>
          tx.update(schema.shiftHandoverVersions).set({ note: "reescrita" }),
        ),
    ]) {
      const code = await operation().then(
        () => "sin error",
        (error: { cause?: { code?: string } }) => error.cause?.code,
      );
      expect(code).toBe("42501");
    }
  });
});
