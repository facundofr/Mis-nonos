import { randomUUID } from "node:crypto";

import { and, eq, isNull, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import * as schema from "@/db/schema";
import { countRequests, getRequest } from "@/features/admission-requests/queries";
import { convertRequest } from "@/features/admission-requests/service";
import { PRIVACY_NOTICE_VERSION } from "@/features/public-intake/privacy";
import { publicIntakeSettingsSchema, publicRequestSchema } from "@/features/public-intake/schemas";
import {
  getPublicSite,
  submitPublicRequest,
  withPublicIntake,
} from "@/features/public-intake/service";
import { updatePublicIntakeSettings } from "@/features/public-intake/settings";
import { createDb, createPool } from "@/lib/db/client";
import { withTenant, type TenantContext } from "@/lib/db/tenant";
import { createOrganization } from "@/lib/organizations/create";
import { sendAdmissionRequestReceipt } from "@/worker/jobs/admission-request-receipt";

// F1-SOL-03 y F1-SOL-04: formulario público (12.9, 17.8). Datos ficticios.

const { ownerUrl, appUrl } = inject("databaseUrls");
const ownerPool = createPool(ownerUrl, { application_name: "pruebas-publico-dueno" });
const appPool = createPool(appUrl, { application_name: "pruebas-publico-app" });
const owner = createDb(ownerPool);
const app = createDb(appPool);

interface Org {
  siteId: string;
  slug: string;
  admin: TenantContext;
}
let orgA: Org;
let orgB: Org;

async function setupOrg(name: string, slug: string): Promise<Org> {
  const created = await owner.transaction((tx) =>
    createOrganization(tx, {
      organizationName: name,
      siteName: name,
      adminEmail: `admin-${randomUUID()}@prueba.test`,
      adminName: "Administración",
    }),
  );
  const [user] = await owner
    .insert(schema.users)
    .values({ name: "Laura Pereyra", email: `${randomUUID()}@prueba.test` })
    .returning({ id: schema.users.id });
  const [role] = await owner
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .where(and(eq(schema.roles.key, "admin"), isNull(schema.roles.organizationId)));
  await owner.insert(schema.organizationMemberships).values({
    organizationId: created.organizationId,
    userId: user!.id,
    roleId: role!.id,
  });
  const admin = { organizationId: created.organizationId, userId: user!.id };
  await withTenant(app, admin, (tx) =>
    updatePublicIntakeSettings(
      tx,
      admin,
      created.siteId,
      publicIntakeSettingsSchema.parse({
        publicIntakeEnabled: "on",
        publicSlug: slug,
        publicIntro: "",
      }),
    ),
  );
  return { siteId: created.siteId, slug, admin };
}

const form = (overrides: Record<string, string> = {}) =>
  publicRequestSchema.parse({
    firstName: "Rosa",
    lastName: "Medina",
    birthDate: "1940-05-02",
    nationalId: "3811222",
    admissionModality: "pami",
    coverageType: "pami",
    coverageMemberNumber: "15-1234567-0-00",
    responsibleName: "Carla Medina",
    responsibleRelationship: "Hijo/a",
    responsiblePhone: "11 5555 1234",
    responsibleEmail: "carla@prueba.test",
    familyMessage: "Busca vacante para fin de mes.",
    consent: "on",
    ...overrides,
  });

const requestsOf = (org: Org) =>
  owner
    .select()
    .from(schema.admissionRequests)
    .where(eq(schema.admissionRequests.siteId, org.siteId));

beforeAll(async () => {
  const suffix = randomUUID().slice(0, 8);
  [orgA, orgB] = await Promise.all([
    setupOrg("Residencia A (pública)", `residencia-a-${suffix}`),
    setupOrg("Residencia B (pública)", `residencia-b-${suffix}`),
  ]);
});

afterAll(async () => {
  await Promise.all([ownerPool.end(), appPool.end()]);
});

describe("Formulario público", () => {
  it("guarda la solicitud de la landing con consentimiento, auditoría y aviso, sin crear pacientes", async () => {
    const result = await submitPublicRequest(app, orgA.slug, form(), randomUUID());
    expect(result).toBe("received");
    const [request] = await requestsOf(orgA);
    expect(request).toMatchObject({
      origin: "landing",
      status: "new",
      firstName: "Rosa",
      createdBy: null,
      contactChannel: null,
      consentTextVersion: PRIVACY_NOTICE_VERSION,
    });
    expect(request!.consentAcceptedAt).toBeInstanceOf(Date);

    const audit = await owner
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.entityId, request!.id));
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ action: "admission_request.created", actorUserId: null });
    // La auditoría no copia los datos de la familia.
    expect(JSON.stringify(audit)).not.toMatch(/Rosa|Medina|5555|carla/);

    const events = await owner
      .select()
      .from(schema.domainEvents)
      .where(eq(schema.domainEvents.entityId, request!.id));
    expect(events).toHaveLength(1);
    expect(events[0]!.payload).toEqual({ createdBy: null, origin: "landing" });

    // El personal la ve en la bandeja, como "nueva".
    const counts = await withTenant(app, orgA.admin, (tx) => countRequests(tx, orgA.siteId));
    expect(counts.nuevas).toBe(1);
    const residents = await owner
      .select()
      .from(schema.residents)
      .where(eq(schema.residents.organizationId, orgA.admin.organizationId));
    expect(residents).toEqual([]);
  });

  it("un doble envío con la misma clave no duplica y responde igual", async () => {
    const before = (await requestsOf(orgB)).length;
    const key = randomUUID();
    expect(await submitPublicRequest(app, orgB.slug, form(), key)).toBe("received");
    expect(await submitPublicRequest(app, orgB.slug, form(), key)).toBe("received");
    expect((await requestsOf(orgB)).length).toBe(before + 1);
  });

  it("la respuesta es la misma aunque el DNI ya exista", async () => {
    const first = await submitPublicRequest(app, orgA.slug, form(), randomUUID());
    const second = await submitPublicRequest(app, orgA.slug, form(), randomUUID());
    expect(first).toBe(second);
  });

  it("el rol público no lee ninguna tabla, ni la solicitud que acaba de crear", async () => {
    for (const table of [
      "admission_requests",
      "residents",
      "sites",
      "organizations",
      "users",
      "audit_events",
      "domain_events",
      "notifications",
    ]) {
      await expect(
        withPublicIntake(app, (tx) => tx.execute(sql.raw(`select 1 from ${table} limit 1`))),
      ).rejects.toThrow();
    }
    // Ni puede modificar ni borrar.
    await expect(
      withPublicIntake(app, (tx) => tx.execute(sql`update admission_requests set status = 'new'`)),
    ).rejects.toThrow();
    await expect(
      withPublicIntake(app, (tx) => tx.execute(sql`delete from admission_requests`)),
    ).rejects.toThrow();
  });

  it("solo puede agregar solicitudes nuevas de la landing de la residencia de la transacción", async () => {
    const values = {
      id: randomUUID(),
      organizationId: orgA.admin.organizationId,
      siteId: orgA.siteId,
      firstName: "Prueba",
      lastName: "Prueba",
      responsibleName: "Prueba",
      responsiblePhone: "11 5555 0000",
      consentAcceptedAt: new Date(),
      consentTextVersion: PRIVACY_NOTICE_VERSION,
      clientRequestId: randomUUID(),
    };
    const insertAs = (orgId: string, overrides: Record<string, unknown>) =>
      withPublicIntake(app, async (tx) => {
        await tx.execute(sql`select set_config('app.org_id', ${orgId}, true)`);
        await tx
          .insert(schema.admissionRequests)
          .values({ ...values, origin: "landing", ...overrides });
      });
    // Otra residencia que la del contexto, otro origen, otro estado o con autor: no.
    await expect(insertAs(orgB.admin.organizationId, {})).rejects.toThrow();
    await expect(insertAs(orgA.admin.organizationId, { origin: "staff" })).rejects.toThrow();
    await expect(insertAs(orgA.admin.organizationId, { status: "contacting" })).rejects.toThrow();
    await expect(
      insertAs(orgA.admin.organizationId, { createdBy: orgA.admin.userId }),
    ).rejects.toThrow();
    await expect(insertAs(orgA.admin.organizationId, { internalNotes: "nota" })).rejects.toThrow();
    // Sin consentimiento, tampoco (restricción de la tabla).
    await expect(
      insertAs(orgA.admin.organizationId, { consentAcceptedAt: null }),
    ).rejects.toThrow();
  });

  it("la residencia sale de la dirección; apagada o desconocida, no se guarda nada", async () => {
    expect(await getPublicSite(app, orgA.slug)).toMatchObject({
      organizationId: orgA.admin.organizationId,
      siteId: orgA.siteId,
    });
    expect(await submitPublicRequest(app, "no-existe", form(), randomUUID())).toBe("not_found");
    expect(await getPublicSite(app, "x'; drop table sites; --")).toBeNull();

    await withTenant(app, orgB.admin, (tx) =>
      updatePublicIntakeSettings(
        tx,
        orgB.admin,
        orgB.siteId,
        publicIntakeSettingsSchema.parse({ publicSlug: orgB.slug, publicIntro: "" }),
      ),
    );
    const before = (await requestsOf(orgB)).length;
    expect(await getPublicSite(app, orgB.slug)).toBeNull();
    expect(await submitPublicRequest(app, orgB.slug, form(), randomUUID())).toBe("not_found");
    expect((await requestsOf(orgB)).length).toBe(before);
    // Se vuelve a publicar para las demás pruebas.
    await withTenant(app, orgB.admin, (tx) =>
      updatePublicIntakeSettings(
        tx,
        orgB.admin,
        orgB.siteId,
        publicIntakeSettingsSchema.parse({
          publicIntakeEnabled: "on",
          publicSlug: orgB.slug,
          publicIntro: "",
        }),
      ),
    );
  });

  it("la dirección es única entre residencias", async () => {
    await expect(
      withTenant(app, orgB.admin, (tx) =>
        updatePublicIntakeSettings(
          tx,
          orgB.admin,
          orgB.siteId,
          publicIntakeSettingsSchema.parse({
            publicIntakeEnabled: "on",
            publicSlug: orgA.slug,
            publicIntro: "",
          }),
        ),
      ),
    ).rejects.toThrow(/ya la usa otra residencia/);
  });

  it("la residencia B no ve las solicitudes de A; A la convierte en ingreso", async () => {
    const [request] = await requestsOf(orgA);
    const fromB = await withTenant(app, orgB.admin, (tx) => getRequest(tx, request!.id));
    expect(fromB).toBeNull();
    const admissionId = await withTenant(app, orgA.admin, (tx) =>
      convertRequest(tx, orgA.admin, request!.id, "2026-11-02"),
    );
    expect(admissionId).toBeTruthy();
    const [after] = await owner
      .select({ status: schema.admissionRequests.status })
      .from(schema.admissionRequests)
      .where(eq(schema.admissionRequests.id, request!.id));
    expect(after!.status).toBe("converted");
  });

  it("el acuse a la familia sale solo si dejó email y no lleva datos del residente", async () => {
    const env = { APP_URL: "http://localhost:3000" } as Parameters<
      typeof sendAdmissionRequestReceipt
    >[1];
    const [request] = await requestsOf(orgB);
    const event = {
      eventId: randomUUID(),
      organizationId: orgB.admin.organizationId,
      siteId: orgB.siteId,
      type: "admission_request.created",
      entityType: "admission_request",
      entityId: request!.id,
      occurredAt: new Date().toISOString(),
    };
    const logged: string[] = [];
    const original = console.info;
    console.info = (...args: unknown[]) => logged.push(args.map(String).join(" "));
    try {
      expect(
        await sendAdmissionRequestReceipt(app, env, { ...event, payload: { origin: "staff" } }),
      ).toBe(false);
      expect(
        await sendAdmissionRequestReceipt(app, env, { ...event, payload: { origin: "landing" } }),
      ).toBe(true);
    } finally {
      console.info = original;
    }
    expect(logged.join("\n")).not.toMatch(/Rosa|Medina|3811222/);

    // Sin email, no hay acuse.
    await submitPublicRequest(app, orgB.slug, form({ responsibleEmail: "" }), randomUUID());
    const withoutEmail = (await requestsOf(orgB)).find((row) => row.responsibleEmail === null);
    expect(
      await sendAdmissionRequestReceipt(app, env, {
        ...event,
        entityId: withoutEmail!.id,
        payload: { origin: "landing" },
      }),
    ).toBe(false);
  });
});
