import { randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import * as schema from "@/db/schema";
import { listSeen, markSeen, resetOnboarding } from "@/features/onboarding/service";
import { createDb, createPool } from "@/lib/db/client";
import { withTenant, type TenantContext } from "@/lib/db/tenant";
import { createOrganization } from "@/lib/organizations/create";

// Guía de uso (onboarding): cada persona ve y marca solo lo suyo.

const { ownerUrl, appUrl } = inject("databaseUrls");
const ownerPool = createPool(ownerUrl, { application_name: "pruebas-guia-dueno" });
const appPool = createPool(appUrl, { application_name: "pruebas-guia-app" });
const owner = createDb(ownerPool);
const app = createDb(appPool);

let marta: TenantContext;
let jorge: TenantContext;

async function member(organizationId: string, name: string): Promise<TenantContext> {
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
  return { organizationId, userId: user!.id };
}

beforeAll(async () => {
  const created = await owner.transaction((tx) =>
    createOrganization(tx, {
      organizationName: "Residencia (guía)",
      siteName: "Sede central",
      adminEmail: `admin-${randomUUID()}@prueba.test`,
      adminName: "Administración",
    }),
  );
  marta = await member(created.organizationId, "Marta Gómez");
  jorge = await member(created.organizationId, "Jorge Suárez");
});

afterAll(async () => {
  await Promise.all([ownerPool.end(), appPool.end()]);
});

describe("Guía de uso", () => {
  it("marcar dos veces no duplica; volver a ver la guía la reinicia", async () => {
    await withTenant(app, marta, (tx) => markSeen(tx, marta, "welcome"));
    await withTenant(app, marta, (tx) => markSeen(tx, marta, "welcome"));
    await withTenant(app, marta, (tx) => markSeen(tx, marta, "tip:pacientes"));
    expect(await withTenant(app, marta, (tx) => listSeen(tx, marta.userId))).toEqual(
      new Set(["welcome", "tip:pacientes"]),
    );
    await withTenant(app, marta, (tx) => resetOnboarding(tx, marta));
    expect(await withTenant(app, marta, (tx) => listSeen(tx, marta.userId))).toEqual(new Set());
  });

  it("nadie ve ni toca lo de otra persona", async () => {
    await withTenant(app, marta, (tx) => markSeen(tx, marta, "tip:turno"));
    const asJorge = await withTenant(app, jorge, (tx) => tx.select().from(schema.userOnboarding));
    expect(asJorge).toEqual([]);
    expect(await withTenant(app, jorge, (tx) => listSeen(tx, marta.userId))).toEqual(new Set());
    const code = await withTenant(app, jorge, (tx) =>
      tx.insert(schema.userOnboarding).values({
        organizationId: marta.organizationId,
        userId: marta.userId,
        key: "welcome",
      }),
    ).then(
      () => "sin error",
      (error: { cause?: { code?: string } }) => error.cause?.code,
    );
    expect(code).toBe("42501");
  });
});
