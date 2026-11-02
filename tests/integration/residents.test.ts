import { randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import * as schema from "@/db/schema";
import { getResident, listContacts, listResidents } from "@/features/residents/queries";
import { contactSchema, residentDataSchema } from "@/features/residents/schemas";
import {
  addAllergy,
  confirmAdmission,
  dischargeResident,
  saveContact,
  startAdmission,
  updateResidentData,
} from "@/features/residents/service";
import { createDb, createPool } from "@/lib/db/client";
import { withTenant, type TenantContext } from "@/lib/db/tenant";
import { CONCURRENT_CHANGE_MESSAGE, DomainError } from "@/lib/errors";
import { createOrganization } from "@/lib/organizations/create";

// Etapa 3.2: pacientes, contactos e ingreso guiado contra PostgreSQL real.
// Datos ficticios.

const { ownerUrl, appUrl } = inject("databaseUrls");
const ownerPool = createPool(ownerUrl, { application_name: "pruebas-pacientes-dueno" });
const appPool = createPool(appUrl, { application_name: "pruebas-pacientes-app" });
const owner = createDb(ownerPool);
const app = createDb(appPool);

interface Org {
  siteId: string;
  actor: TenantContext;
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
  const [role] = await owner
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .where(and(eq(schema.roles.key, "admin"), isNull(schema.roles.organizationId)));
  await owner.insert(schema.organizationMemberships).values({
    organizationId: created.organizationId,
    userId: user!.id,
    roleId: role!.id,
  });
  return {
    siteId: created.siteId,
    actor: { organizationId: created.organizationId, userId: user!.id },
  };
}

const residentInput = (overrides: Record<string, string> = {}) =>
  residentDataSchema.parse({
    firstName: "Elena",
    lastName: "Ramírez",
    nationalId: String(Math.floor(10_000_000 + Math.random() * 80_000_000)),
    admissionDate: "2026-10-14",
    roomLabel: "12",
    admissionModality: "pami",
    coverageType: "pami",
    coverageMemberNumber: "15-0452778-0-00",
    ...overrides,
  });

const responsible = contactSchema.parse({
  name: "Silvia Ramírez",
  phoneMobile: "11 5821-4430",
  emergencyPriority: "1",
  isAdmissionResponsible: "on",
  nationalId: "20111222",
  address: "Calle Falsa 123",
});

let orgA: Org;
let orgB: Org;

beforeAll(async () => {
  orgA = await setup("Residencia A (pacientes)");
  orgB = await setup("Residencia B (pacientes)");
});

afterAll(async () => {
  await Promise.all([ownerPool.end(), appPool.end()]);
});

const inA = <T>(fn: Parameters<typeof withTenant<T>>[2]) => withTenant(app, orgA.actor, fn);

async function admitted(org: Org, overrides: Record<string, string> = {}): Promise<string> {
  return withTenant(app, org.actor, async (tx) => {
    const { residentId, admissionId } = await startAdmission(
      tx,
      org.actor,
      org.siteId,
      residentInput(overrides),
    );
    await saveContact(tx, org.actor, residentId, null, responsible, "2026-10-14");
    await confirmAdmission(tx, org.actor, admissionId);
    return residentId;
  });
}

async function domainError(operation: Promise<unknown>): Promise<string> {
  try {
    await operation;
  } catch (error) {
    if (error instanceof DomainError) return error.message;
    throw error;
  }
  throw new Error("Se esperaba un DomainError");
}

describe("Ingreso guiado", () => {
  it("el borrador no aparece en la lista hasta confirmarlo", async () => {
    const { residentId, admissionId } = await inA((tx) =>
      startAdmission(tx, orgA.actor, orgA.siteId, residentInput({ firstName: "Borrador" })),
    );
    const before = await inA((tx) => listResidents(tx, { query: "borrador" }));
    expect(before).toEqual([]);

    expect(await domainError(inA((tx) => confirmAdmission(tx, orgA.actor, admissionId)))).toBe(
      "Falta el responsable de la internación (paso 2).",
    );

    await inA(async (tx) => {
      await saveContact(tx, orgA.actor, residentId, null, responsible, "2026-10-14");
      await confirmAdmission(tx, orgA.actor, admissionId);
    });
    const after = await inA((tx) => listResidents(tx, { query: "borrador" }));
    expect(after.map((row) => row.id)).toEqual([residentId]);
  });
});

describe("Pacientes", () => {
  it("se buscan sin acentos ni mayúsculas, por nombre, habitación o DNI", async () => {
    const residentId = await admitted(orgA, {
      firstName: "Héctor",
      lastName: "Benítez",
      roomLabel: "7B",
    });
    for (const query of ["hector", "BENITEZ", "7b", "Héctor Ben"]) {
      const found = await inA((tx) => listResidents(tx, { query }));
      expect(found.map((row) => row.id)).toContain(residentId);
    }
    // Los comodines de LIKE se buscan como texto.
    expect(await inA((tx) => listResidents(tx, { query: "%" }))).toEqual([]);
  });

  it("una residencia no ve ni toca los pacientes de otra", async () => {
    const residentInB = await admitted(orgB, { firstName: "Rosa", lastName: "Medina" });
    expect(await inA((tx) => getResident(tx, residentInB))).toBeNull();
    expect(await inA((tx) => listResidents(tx, { query: "medina" }))).toEqual([]);
    expect(
      await domainError(
        inA((tx) =>
          addAllergy(tx, orgA.actor, residentInB, {
            substance: "Penicilina",
            reaction: null,
            severity: null,
          }),
        ),
      ),
    ).toBe("Ese paciente no existe.");
  });

  it("una edición con una versión vieja no pisa el cambio de otra persona", async () => {
    const residentId = await admitted(orgA);
    const resident = await inA((tx) => getResident(tx, residentId));
    const data = residentInput({ nationalId: resident!.nationalId!, roomLabel: "14" });
    await inA((tx) => updateResidentData(tx, orgA.actor, residentId, resident!.version, data));
    expect(
      await domainError(
        inA((tx) => updateResidentData(tx, orgA.actor, residentId, resident!.version, data)),
      ),
    ).toBe(CONCURRENT_CHANGE_MESSAGE);
  });

  it("hay un solo responsable de la internación: marcar otro libera al anterior", async () => {
    const residentId = await admitted(orgA);
    await inA((tx) =>
      saveContact(
        tx,
        orgA.actor,
        residentId,
        null,
        { ...responsible, name: "Diego Ramírez", emergencyPriority: 2 },
        "2026-10-15",
      ),
    );
    const contacts = await inA((tx) => listContacts(tx, residentId));
    expect(
      contacts.filter((contact) => contact.isAdmissionResponsible).map((contact) => contact.name),
    ).toEqual(["Diego Ramírez"]);

    // Y la base lo garantiza aunque alguien se saltee el servicio.
    const error = await owner
      .update(schema.residentContacts)
      .set({ isAdmissionResponsible: true })
      .where(eq(schema.residentContacts.residentId, residentId))
      .catch((caught: { cause?: { code?: string } }) => caught.cause?.code);
    expect(error).toBe("23505");
  });

  it("el egreso no borra nada y lo saca de los activos", async () => {
    const residentId = await admitted(orgA, { firstName: "Amalia" });
    await inA((tx) =>
      dischargeResident(tx, orgA.actor, residentId, {
        reason: "traslado",
        date: "2026-11-01",
        notes: null,
      }),
    );
    const resident = await inA((tx) => getResident(tx, residentId));
    expect(resident).toMatchObject({ status: "discharged", dischargeReason: "traslado" });
    expect((await inA((tx) => listContacts(tx, residentId))).length).toBe(1);
    const active = await inA((tx) => listResidents(tx, { query: "amalia" }));
    expect(active.map((row) => row.id)).not.toContain(residentId);
    const audit = await owner
      .select({ action: schema.auditEvents.action })
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.entityId, residentId));
    expect(audit.map((row) => row.action)).toContain("resident.status_changed");
  });

  it("la app no puede borrar pacientes ni contactos", async () => {
    const residentId = await admitted(orgA);
    const error = await inA((tx) =>
      tx.delete(schema.residents).where(eq(schema.residents.id, residentId)),
    ).catch((caught: { cause?: { code?: string } }) => caught.cause?.code);
    expect(error).toBe("42501");
  });
});
