import { randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import * as schema from "@/db/schema";
import {
  countUnread,
  listNotifications,
  notifyEmergencyViewed,
} from "@/features/notifications/service";
import { residentDataSchema } from "@/features/residents/schemas";
import { startAdmission } from "@/features/residents/service";
import { createDb, createPool } from "@/lib/db/client";
import { withSystemTenant, withTenant } from "@/lib/db/tenant";
import { createOrganization } from "@/lib/organizations/create";

// Etapa 3.3: avisos de ficha de emergencia abierta (DC-02, F1-NOT-01).

const { ownerUrl, appUrl } = inject("databaseUrls");
const ownerPool = createPool(ownerUrl, { application_name: "pruebas-avisos-dueno" });
const appPool = createPool(appUrl, { application_name: "pruebas-avisos-app" });
const owner = createDb(ownerPool);
const app = createDb(appPool);

const ids = { org: "", resident: "", direccion1: "", direccion2: "", cuidado: "" };

async function member(name: string, roleKey: string): Promise<string> {
  const [user] = await owner
    .insert(schema.users)
    .values({ name, email: `${randomUUID()}@prueba.test` })
    .returning({ id: schema.users.id });
  const [role] = await owner
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .where(and(eq(schema.roles.key, roleKey), isNull(schema.roles.organizationId)));
  await owner.insert(schema.organizationMemberships).values({
    organizationId: ids.org,
    userId: user!.id,
    roleId: role!.id,
  });
  return user!.id;
}

beforeAll(async () => {
  const created = await owner.transaction((tx) =>
    createOrganization(tx, {
      organizationName: "Residencia (avisos)",
      siteName: "Sede central",
      adminEmail: `admin-${randomUUID()}@prueba.test`,
      adminName: "Administración",
    }),
  );
  ids.org = created.organizationId;
  ids.direccion1 = await member("Sofía Medina", "admin");
  ids.direccion2 = await member("Pablo Ríos", "master");
  ids.cuidado = await member("Marta Gómez", "profesional");
  const actor = { organizationId: ids.org, userId: ids.direccion1 };
  ({ residentId: ids.resident } = await withTenant(app, actor, (tx) =>
    startAdmission(
      tx,
      actor,
      created.siteId,
      residentDataSchema.parse({
        firstName: "Elena",
        lastName: "Ramírez",
        admissionDate: "2026-10-14",
        admissionModality: "private",
        coverageType: "none",
      }),
    ),
  ));
});

afterAll(async () => {
  await Promise.all([ownerPool.end(), appPool.end()]);
});

describe("Aviso de ficha de emergencia abierta", () => {
  it("avisa al Master (salvo a quien la abrió) y no duplica si el trabajo se reintenta", async () => {
    const event = {
      eventId: randomUUID(),
      organizationId: ids.org,
      residentId: ids.resident,
      viewerUserId: ids.direccion1,
    };
    const first = await withSystemTenant(app, ids.org, (tx) => notifyEmergencyViewed(tx, event));
    const retry = await withSystemTenant(app, ids.org, (tx) => notifyEmergencyViewed(tx, event));
    expect(first).toBe(1);
    expect(retry).toBe(0);

    const asDireccion2 = await withTenant(
      app,
      { organizationId: ids.org, userId: ids.direccion2 },
      (tx) => listNotifications(tx, ids.direccion2),
    );
    expect(asDireccion2.map((item) => item.title)).toEqual(["Se abrió una ficha de emergencia"]);
    expect(asDireccion2[0]?.body).not.toMatch(/alerg|diagn/i);
  });

  it("cada persona ve solo sus avisos", async () => {
    const asCuidado = await withTenant(
      app,
      { organizationId: ids.org, userId: ids.cuidado },
      async (tx) => ({
        all: await tx.select().from(schema.notifications),
        unread: await countUnread(tx, ids.direccion2),
      }),
    );
    expect(asCuidado.all).toEqual([]);
    expect(asCuidado.unread).toBe(0);
  });
});
