import { randomUUID } from "node:crypto";

import { and, eq, isNull, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import * as schema from "@/db/schema";
import {
  countRequests,
  findRequestDuplicates,
  getRequest,
} from "@/features/admission-requests/queries";
import { requestSchema } from "@/features/admission-requests/schemas";
import {
  changeRequestStatus,
  convertRequest,
  createRequest,
  discardRequest,
} from "@/features/admission-requests/service";
import { notifyAdmissionRequestCreated } from "@/features/notifications/service";
import { listContacts } from "@/features/residents/queries";
import { recordAudit } from "@/lib/audit";
import { createDb, createPool } from "@/lib/db/client";
import { withSystemTenant, withTenant, type TenantContext } from "@/lib/db/tenant";
import { createOrganization } from "@/lib/organizations/create";
import { purgeStaleAdmissionRequests } from "@/worker/jobs/purge-admission-requests";

// Etapa 3.7: solicitudes de ingreso (7.3-C3, F1-SOL-01, F1-SOL-02, DC-14). Datos ficticios.

const { ownerUrl, appUrl, workerUrl } = inject("databaseUrls");
const ownerPool = createPool(ownerUrl, { application_name: "pruebas-solicitudes-dueno" });
const appPool = createPool(appUrl, { application_name: "pruebas-solicitudes-app" });
const workerPool = createPool(workerUrl, { application_name: "pruebas-solicitudes-worker" });
const owner = createDb(ownerPool);
const app = createDb(appPool);
const worker = createDb(workerPool);

interface Org {
  siteId: string;
  direccion: TenantContext;
  admin: TenantContext;
}
let orgA: Org;
let orgB: Org;

async function member(organizationId: string, name: string, roleKey: string): Promise<string> {
  const [user] = await owner
    .insert(schema.users)
    .values({ name, email: `${randomUUID()}@prueba.test` })
    .returning({ id: schema.users.id });
  const [role] = await owner
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .where(and(eq(schema.roles.key, roleKey), isNull(schema.roles.organizationId)));
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
  return {
    siteId: created.siteId,
    direccion: {
      organizationId,
      userId: await member(organizationId, "Sofía Medina", "admin"),
    },
    admin: { organizationId, userId: await member(organizationId, "Laura Pereyra", "admin") },
  };
}

const input = (overrides: Record<string, string> = {}) =>
  requestSchema.parse({
    contactChannel: "phone",
    firstName: "Rosa",
    lastName: "Medina",
    responsibleName: "Carla Medina",
    responsiblePhone: "11 5555 1234",
    ...overrides,
  });

const complete = (overrides: Record<string, string> = {}) =>
  input({
    nationalId: "3.811.222",
    birthDate: "1940-05-02",
    admissionModality: "pami",
    coverageType: "pami",
    coverageMemberNumber: "15-1234567-0-00",
    responsibleRelationship: "Hijo/a",
    responsibleNationalId: "20111333",
    responsibleAddress: "Calle Falsa 123",
    contact2Name: "Pedro Medina",
    contact2Phone: "11 4444 0000",
    ...overrides,
  });

function newRequest(org: Org, data = input(), clientRequestId = randomUUID()) {
  return withTenant(app, org.direccion, (tx) =>
    createRequest(tx, org.direccion, org.siteId, data, clientRequestId),
  );
}

beforeAll(async () => {
  [orgA, orgB] = await Promise.all([
    setupOrg("Residencia A (solicitudes)"),
    setupOrg("Residencia B (solicitudes)"),
  ]);
});

afterAll(async () => {
  await Promise.all([ownerPool.end(), appPool.end(), workerPool.end()]);
});

describe("Solicitudes de ingreso", () => {
  it("el mismo envío dos veces no duplica; no crea pacientes", async () => {
    const key = randomUUID();
    const first = await newRequest(orgA, input(), key);
    const again = await newRequest(orgA, input(), key);
    expect(again).toBe(first);
    const residents = await withTenant(app, orgA.direccion, (tx) =>
      tx.select().from(schema.residents),
    );
    expect(residents).toEqual([]);
    const counts = await withTenant(app, orgA.direccion, (tx) => countRequests(tx, orgA.siteId));
    expect(counts).toMatchObject({ abiertas: 1, nuevas: 1 });
  });

  it("avisa a Administración y Dirección (salvo a quien la cargó), sin datos del paciente", async () => {
    const requestId = await newRequest(orgA);
    const created = await withSystemTenant(app, orgA.direccion.organizationId, (tx) =>
      notifyAdmissionRequestCreated(tx, {
        eventId: randomUUID(),
        organizationId: orgA.direccion.organizationId,
        requestId,
        createdBy: orgA.direccion.userId,
      }),
    );
    // Laura (Administración). Sofía la cargó; la administradora inicial
    // todavía es una invitación sin aceptar.
    expect(created).toBe(1);
    const rows = await owner
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.entityId, requestId));
    expect(JSON.stringify(rows)).not.toMatch(/Rosa|Medina/);
  });

  it("estados: en contacto, en espera y descartada con motivo; cerrada no cambia", async () => {
    const requestId = await newRequest(orgA);
    await withTenant(app, orgA.admin, (tx) =>
      changeRequestStatus(tx, orgA.admin, requestId, "contacting"),
    );
    await withTenant(app, orgA.admin, (tx) =>
      changeRequestStatus(tx, orgA.admin, requestId, "waitlisted"),
    );
    await withTenant(app, orgA.admin, (tx) =>
      discardRequest(tx, orgA.admin, requestId, {
        discardReason: "no_vacancy",
        discardNotes: null,
      }),
    );
    await expect(
      withTenant(app, orgA.admin, (tx) =>
        changeRequestStatus(tx, orgA.admin, requestId, "contacting"),
      ),
    ).rejects.toThrow(/cerrada/);
    const found = await withTenant(app, orgA.admin, (tx) => getRequest(tx, requestId));
    expect(found?.request).toMatchObject({ status: "discarded", discardReason: "no_vacancy" });
    // La auditoría no copia los datos de la familia (se borran a los 12 meses).
    const audit = await owner
      .select({ action: schema.auditEvents.action, changes: schema.auditEvents.changes })
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.entityId, requestId));
    expect(audit.map((row) => row.action)).toEqual(
      expect.arrayContaining([
        "admission_request.created",
        "admission_request.status_changed",
        "admission_request.discarded",
      ]),
    );
    expect(JSON.stringify(audit)).not.toMatch(/Rosa|Medina|5555/);
  });

  it("para convertir faltan modalidad y cobertura", async () => {
    const requestId = await newRequest(orgA);
    await expect(
      withTenant(app, orgA.direccion, (tx) =>
        convertRequest(tx, orgA.direccion, requestId, "2026-11-02"),
      ),
    ).rejects.toThrow(/la modalidad, la cobertura/);
  });

  it("convertir crea el ingreso con paciente, responsable y familiar, en una transacción", async () => {
    const requestId = await newRequest(orgA, complete({ desiredAdmissionDate: "2026-11-10" }));
    const { admissionId, residentId } = await withTenant(app, orgA.direccion, (tx) =>
      convertRequest(tx, orgA.direccion, requestId, "2026-11-02"),
    );
    const result = await withTenant(app, orgA.direccion, async (tx) => ({
      request: (await getRequest(tx, requestId))?.request,
      contacts: await listContacts(tx, residentId),
      resident: (
        await tx.select().from(schema.residents).where(eq(schema.residents.id, residentId))
      )[0],
      admission: (
        await tx.select().from(schema.admissions).where(eq(schema.admissions.id, admissionId))
      )[0],
    }));
    expect(result.request).toMatchObject({
      status: "converted",
      convertedAdmissionId: admissionId,
    });
    expect(result.resident).toMatchObject({
      status: "admission_draft",
      nationalId: "3811222",
      admissionDate: "2026-11-10",
      admissionModality: "pami",
    });
    expect(result.admission).toMatchObject({ status: "draft", currentStep: 2 });
    expect(
      result.contacts.map((contact) => [
        contact.name,
        contact.emergencyPriority,
        contact.isAdmissionResponsible,
      ]),
    ).toEqual([
      ["Carla Medina", 1, true],
      ["Pedro Medina", 2, false],
    ]);
    // Ya convertida: no se convierte dos veces.
    await expect(
      withTenant(app, orgA.direccion, (tx) =>
        convertRequest(tx, orgA.direccion, requestId, "2026-11-02"),
      ),
    ).rejects.toThrow(/cerrada/);
  });

  it("avisa de duplicados por DNI y no convierte si ya hay un paciente", async () => {
    const requestId = await newRequest(orgA, complete());
    const duplicates = await withTenant(app, orgA.direccion, async (tx) =>
      findRequestDuplicates(tx, (await getRequest(tx, requestId))!.request),
    );
    expect(duplicates.residents).toHaveLength(1);
    expect(duplicates.requests.length).toBeGreaterThanOrEqual(1);
    await expect(
      withTenant(app, orgA.direccion, (tx) =>
        convertRequest(tx, orgA.direccion, requestId, "2026-11-02"),
      ),
    ).rejects.toThrow(/Ya hay un paciente con ese DNI/);
    const still = await withTenant(app, orgA.direccion, (tx) => getRequest(tx, requestId));
    expect(still?.request.status).toBe("new");
  });

  it("una residencia no ve las solicitudes de otra; la app no las borra", async () => {
    const requestId = await newRequest(orgA);
    expect(await withTenant(app, orgB.direccion, (tx) => getRequest(tx, requestId))).toBeNull();
    const code = await withTenant(app, orgA.direccion, (tx) =>
      tx.delete(schema.admissionRequests).where(eq(schema.admissionRequests.id, requestId)),
    ).then(
      () => "sin error",
      (error: { cause?: { code?: string } }) => error.cause?.code,
    );
    expect(code).toBe("42501");
    const purge = await withTenant(app, orgA.direccion, (tx) =>
      tx.execute(sql`select * from app.purge_stale_admission_requests(12)`),
    ).then(
      () => "sin error",
      (error: { cause?: { code?: string } }) => error.cause?.code,
    );
    expect(purge).toBe("42501");
  });

  it("DC-14: el worker borra las no convertidas sin actividad en 12 meses y lo audita", async () => {
    const stale = await newRequest(orgB);
    const recent = await newRequest(orgB);
    const converted = await newRequest(orgB, complete({ nationalId: "4999888" }));
    await withTenant(app, orgB.direccion, (tx) =>
      convertRequest(tx, orgB.direccion, converted, "2026-11-02"),
    );
    await owner
      .update(schema.admissionRequests)
      .set({ updatedAt: sql`now() - interval '13 months'` })
      .where(sql`${schema.admissionRequests.id} in (${stale}, ${converted})`);

    const deleted = await purgeStaleAdmissionRequests(worker, app, recordAudit);
    expect(deleted).toBeGreaterThanOrEqual(1);
    const remaining = await owner
      .select({ id: schema.admissionRequests.id })
      .from(schema.admissionRequests)
      .where(eq(schema.admissionRequests.organizationId, orgB.direccion.organizationId));
    const ids = remaining.map((row) => row.id);
    expect(ids).not.toContain(stale);
    expect(ids).toEqual(expect.arrayContaining([recent, converted]));
    const [audit] = await owner
      .select({ metadata: schema.auditEvents.metadata })
      .from(schema.auditEvents)
      .where(
        and(
          eq(schema.auditEvents.organizationId, orgB.direccion.organizationId),
          eq(schema.auditEvents.action, "admission_request.purged"),
        ),
      );
    expect(audit?.metadata).toMatchObject({ count: 1, months: 12 });
  });
});
