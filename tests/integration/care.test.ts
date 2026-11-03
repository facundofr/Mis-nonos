import { randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import * as schema from "@/db/schema";
import { listEntityActivity } from "@/features/activity/queries";
import {
  countOpenEmergencies,
  getNursingSpecialty,
  lastVisitsBySpecialty,
  listEmergencies,
  listEncounters,
  listSpecialties,
  upcomingControls,
} from "@/features/care/queries";
import {
  closeEmergencySchema,
  emergencySchema,
  encounterSchema,
  professionalSchema,
} from "@/features/care/schemas";
import {
  closeEmergency,
  createProfessional,
  createSpecialty,
  recordEmergency,
  recordEncounter,
  updateSpecialty,
  voidEncounter,
} from "@/features/care/service";
import { residentDataSchema } from "@/features/residents/schemas";
import { startAdmission } from "@/features/residents/service";
import { createDb, createPool } from "@/lib/db/client";
import { withTenant, type TenantContext } from "@/lib/db/tenant";
import { DomainError } from "@/lib/errors";
import { createOrganization } from "@/lib/organizations/create";

// Seguimiento del cuidado (docs/decisions/0017): especialidades,
// profesionales, atenciones y emergencias. Datos ficticios.

const { ownerUrl, appUrl } = inject("databaseUrls");
const ownerPool = createPool(ownerUrl, { application_name: "pruebas-cuidado-dueno" });
const appPool = createPool(appUrl, { application_name: "pruebas-cuidado-app" });
const owner = createDb(ownerPool);
const app = createDb(appPool);

type RoleKey = "admin" | "direccion" | "enfermeria" | "cuidado";

interface Org {
  organizationId: string;
  siteId: string;
  nurse: TenantContext;
  carer: TenantContext;
  director: TenantContext;
  residentId: string;
  nursingId: string;
  kinesiologyId: string;
}

async function member(organizationId: string, name: string, role: RoleKey): Promise<string> {
  const [user] = await owner
    .insert(schema.users)
    .values({ name, email: `${randomUUID()}@prueba.test` })
    .returning({ id: schema.users.id });
  const [roleRow] = await owner
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .where(and(eq(schema.roles.key, role), isNull(schema.roles.organizationId)));
  await owner
    .insert(schema.organizationMemberships)
    .values({ organizationId, userId: user!.id, roleId: roleRow!.id });
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
  const nurse = {
    organizationId,
    userId: await member(organizationId, "Marta Gómez", "enfermeria"),
  };
  const carer = { organizationId, userId: await member(organizationId, "Jorge Suárez", "cuidado") };
  const director = {
    organizationId,
    userId: await member(organizationId, "Elena Ruiz", "direccion"),
  };
  const { residentId } = await withTenant(app, nurse, (tx) =>
    startAdmission(
      tx,
      nurse,
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
  await owner
    .update(schema.residents)
    .set({ status: "active" })
    .where(eq(schema.residents.id, residentId));
  const specialties = await owner
    .select({ id: schema.specialties.id, name: schema.specialties.name })
    .from(schema.specialties)
    .where(eq(schema.specialties.organizationId, organizationId));
  const byName = (value: string) => specialties.find((row) => row.name === value)!.id;
  return {
    organizationId,
    siteId: created.siteId,
    nurse,
    carer,
    director,
    residentId,
    nursingId: byName("Enfermería"),
    kinesiologyId: byName("Kinesiología"),
  };
}

let orgA: Org;
let orgB: Org;

const encounter = (org: Org, overrides: Record<string, string> = {}) =>
  encounterSchema.parse({
    specialtyId: org.nursingId,
    occurredDate: "2026-11-02",
    occurredTime: "09:30",
    location: "in_house",
    reason: "Control de presión",
    ...overrides,
  });

const emergency = (overrides: Record<string, string> = {}) =>
  emergencySchema.parse({
    startedDate: "2026-11-02",
    startedTime: "22:15",
    description: "Caída en el baño, golpe en la cadera.",
    calls: "Servicio de emergencias y la hija",
    ...overrides,
  });

const NOW = new Date("2026-11-03T12:00:00Z");

async function domainError(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof DomainError) return error.message;
    throw error;
  }
  return "sin error";
}

beforeAll(async () => {
  [orgA, orgB] = await Promise.all([
    setupOrg("Residencia A (cuidado)"),
    setupOrg("Residencia B (cuidado)"),
  ]);
});

afterAll(async () => {
  await Promise.all([ownerPool.end(), appPool.end()]);
});

describe("Residencia nueva", () => {
  it("tiene el módulo encendido y las especialidades iniciales, con Enfermería marcada", async () => {
    const [module] = await owner
      .select({ enabled: schema.organizationModules.enabled })
      .from(schema.organizationModules)
      .where(
        and(
          eq(schema.organizationModules.organizationId, orgA.organizationId),
          eq(schema.organizationModules.moduleKey, "care"),
        ),
      );
    expect(module?.enabled).toBe(true);
    const nursing = await withTenant(app, orgA.nurse, (tx) => getNursingSpecialty(tx));
    expect(nursing?.id).toBe(orgA.nursingId);
    const list = await withTenant(app, orgA.nurse, (tx) => listSpecialties(tx));
    expect(list).toHaveLength(10);
  });
});

describe("Atenciones", () => {
  it("Enfermería registra una atención y aparece en la lista y en la última visita", async () => {
    const id = await withTenant(app, orgA.nurse, (tx) =>
      recordEncounter(tx, orgA.nurse, { ...encounter(orgA), residentId: orgA.residentId }, NOW),
    );
    const list = await withTenant(app, orgA.nurse, (tx) =>
      listEncounters(tx, { siteId: orgA.siteId, specialtyId: orgA.nursingId }),
    );
    expect(list.map((row) => row.id)).toContain(id);
    expect(list[0]?.authorName).toBe("Marta Gómez");

    const visits = await withTenant(app, orgA.nurse, (tx) =>
      lastVisitsBySpecialty(tx, { siteId: orgA.siteId, specialtyId: orgA.nursingId }),
    );
    // 09:30 en Buenos Aires = 12:30 UTC.
    expect(visits[0]?.lastAt?.toISOString()).toBe("2026-11-02T12:30:00.000Z");

    const [audit] = await owner
      .select({ metadata: schema.auditEvents.metadata, changes: schema.auditEvents.changes })
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.entityId, id));
    expect(audit?.metadata).toMatchObject({ residentId: orgA.residentId });
    // Sin textos clínicos en la auditoría.
    expect(JSON.stringify(audit)).not.toContain("presión");
  });

  it("no acepta atenciones futuras ni un control anterior a la atención", async () => {
    expect(
      await domainError(
        withTenant(app, orgA.nurse, (tx) =>
          recordEncounter(
            tx,
            orgA.nurse,
            { ...encounter(orgA, { occurredDate: "2026-11-04" }), residentId: orgA.residentId },
            NOW,
          ),
        ),
      ),
    ).toBe("La fecha y hora no pueden ser futuras.");
    expect(
      await domainError(
        withTenant(app, orgA.nurse, (tx) =>
          recordEncounter(
            tx,
            orgA.nurse,
            {
              ...encounter(orgA, { nextControlOn: "2026-11-01" }),
              residentId: orgA.residentId,
            },
            NOW,
          ),
        ),
      ),
    ).toBe("El próximo control tiene que ser después de la atención.");
  });

  it("los próximos controles desaparecen cuando hay una atención posterior", async () => {
    await withTenant(app, orgA.director, (tx) =>
      recordEncounter(
        tx,
        orgA.director,
        {
          ...encounter(orgA, {
            specialtyId: orgA.kinesiologyId,
            occurredDate: "2026-10-27",
            nextControlOn: "2026-11-05",
            reason: "Rehabilitación de rodilla",
          }),
          residentId: orgA.residentId,
        },
        NOW,
      ),
    );
    const before = await withTenant(app, orgA.nurse, (tx) =>
      upcomingControls(tx, { siteId: orgA.siteId, today: "2026-11-03" }),
    );
    expect(before.map((row) => row.specialtyName)).toEqual(["Kinesiología"]);

    await withTenant(app, orgA.director, (tx) =>
      recordEncounter(
        tx,
        orgA.director,
        {
          ...encounter(orgA, {
            specialtyId: orgA.kinesiologyId,
            occurredDate: "2026-11-03",
            occurredTime: "08:00",
          }),
          residentId: orgA.residentId,
        },
        NOW,
      ),
    );
    const after = await withTenant(app, orgA.nurse, (tx) =>
      upcomingControls(tx, { siteId: orgA.siteId, today: "2026-11-03" }),
    );
    expect(after).toEqual([]);
  });

  it("una atención se anula una sola vez y queda en la lista marcada", async () => {
    const id = await withTenant(app, orgA.nurse, (tx) =>
      recordEncounter(tx, orgA.nurse, { ...encounter(orgA), residentId: orgA.residentId }, NOW),
    );
    await withTenant(app, orgA.nurse, (tx) =>
      voidEncounter(tx, orgA.nurse, id, { voidReason: "Era de otro paciente" }),
    );
    expect(
      await domainError(
        withTenant(app, orgA.nurse, (tx) =>
          voidEncounter(tx, orgA.nurse, id, { voidReason: "Otra vez" }),
        ),
      ),
    ).toBe("Esa atención no existe o ya está anulada.");
    const list = await withTenant(app, orgA.nurse, (tx) =>
      listEncounters(tx, { siteId: orgA.siteId }),
    );
    expect(list.find((row) => row.id === id)?.voidReason).toBe("Era de otro paciente");
  });

  it("la app no puede cambiar el texto de una atención (solo anularla)", async () => {
    const [row] = await owner
      .select({ id: schema.careEncounters.id })
      .from(schema.careEncounters)
      .where(eq(schema.careEncounters.organizationId, orgA.organizationId))
      .limit(1);
    await expect(
      withTenant(app, orgA.nurse, (tx) =>
        tx
          .update(schema.careEncounters)
          .set({ reason: "Otro motivo" })
          .where(eq(schema.careEncounters.id, row!.id)),
      ),
    ).rejects.toMatchObject({ cause: { code: "42501" } });
  });
});

describe("Permisos en la base", () => {
  it("Cuidado no ve atenciones ni profesionales, ni puede registrar una", async () => {
    const list = await withTenant(app, orgA.carer, (tx) =>
      listEncounters(tx, { siteId: orgA.siteId }),
    );
    expect(list).toEqual([]);
    expect(await withTenant(app, orgA.carer, (tx) => listSpecialties(tx))).toEqual([]);
    await expect(
      withTenant(app, orgA.carer, (tx) =>
        tx.insert(schema.careEncounters).values({
          organizationId: orgA.organizationId,
          siteId: orgA.siteId,
          residentId: orgA.residentId,
          specialtyId: orgA.nursingId,
          occurredAt: NOW,
          reason: "Sin permiso",
          createdBy: orgA.carer.userId,
        }),
      ),
    ).rejects.toMatchObject({ cause: { code: "42501" } });
  });

  it("Enfermería no puede agregar profesionales (care.manage)", async () => {
    await expect(
      withTenant(app, orgA.nurse, (tx) =>
        createProfessional(
          tx,
          orgA.nurse,
          professionalSchema.parse({
            name: "Lic. Paula Díaz",
            specialtyId: orgA.kinesiologyId,
            kind: "external",
            active: "on",
          }),
        ),
      ),
    ).rejects.toMatchObject({ cause: { code: "42501" } });
  });

  it("una residencia no ve las atenciones ni las emergencias de otra", async () => {
    const list = await withTenant(app, orgB.nurse, (tx) =>
      listEncounters(tx, { siteId: orgA.siteId }),
    );
    expect(list).toEqual([]);
    const emergencies = await withTenant(app, orgB.nurse, (tx) =>
      listEmergencies(tx, { siteId: orgA.siteId }),
    );
    expect(emergencies).toEqual([]);
  });
});

describe("Especialidades y profesionales", () => {
  it("Dirección agrega una especialidad y un profesional; los nombres no se repiten", async () => {
    const specialtyId = await withTenant(app, orgA.director, (tx) =>
      createSpecialty(tx, orgA.director, { name: "Cardiología" }),
    );
    expect(
      await domainError(
        withTenant(app, orgA.director, (tx) =>
          createSpecialty(tx, orgA.director, { name: "Cardiología" }),
        ),
      ),
    ).toBe("Ya hay una especialidad con ese nombre.");
    const professionalId = await withTenant(app, orgA.director, (tx) =>
      createProfessional(
        tx,
        orgA.director,
        professionalSchema.parse({
          name: "Dr. Ramón Ortiz",
          specialtyId,
          kind: "external",
          licenseNumber: "MN 12345",
          phone: "11 4444-5555",
          active: "on",
        }),
      ),
    );
    expect(professionalId).toBeTruthy();
    const list = await withTenant(app, orgA.nurse, (tx) => listSpecialties(tx));
    expect(list.find((row) => row.id === specialtyId)?.professionals).toBe(1);
  });

  it("Enfermería no se puede desactivar", async () => {
    expect(
      await domainError(
        withTenant(app, orgA.director, (tx) =>
          updateSpecialty(tx, orgA.director, orgA.nursingId, { name: "Enfermería", active: false }),
        ),
      ),
    ).toBe("Enfermería no se puede desactivar: la usa la sección del menú.");
  });
});

describe("Emergencias", () => {
  it("Cuidado registra una emergencia; queda abierta hasta que se cierra", async () => {
    const id = await withTenant(app, orgA.carer, (tx) =>
      recordEmergency(
        tx,
        orgA.carer,
        {
          ...emergency({ transferred: "on", transferDestination: "Hospital Central" }),
          residentId: orgA.residentId,
        },
        NOW,
      ),
    );
    expect(await withTenant(app, orgA.carer, (tx) => countOpenEmergencies(tx, orgA.siteId))).toBe(
      1,
    );

    await withTenant(app, orgA.carer, (tx) =>
      closeEmergency(
        tx,
        orgA.carer,
        id,
        closeEmergencySchema.parse({
          calls: "Servicio de emergencias, la hija y Dirección",
          transferred: "on",
          transferDestination: "Hospital Central",
          outcome: "Quedó en observación; vuelve mañana.",
        }),
      ),
    );
    const [row] = await withTenant(app, orgA.carer, (tx) =>
      listEmergencies(tx, { siteId: orgA.siteId }),
    );
    expect(row).toMatchObject({
      status: "closed",
      transferDestination: "Hospital Central",
      closedByName: "Jorge Suárez",
    });
    expect(
      await domainError(
        withTenant(app, orgA.carer, (tx) =>
          closeEmergency(tx, orgA.carer, id, closeEmergencySchema.parse({ outcome: "Otra vez" })),
        ),
      ),
    ).toBe("Esa emergencia no existe o ya está cerrada.");
  });

  it("sin traslado no guarda destino, y no acepta una hora futura", async () => {
    const id = await withTenant(app, orgA.nurse, (tx) =>
      recordEmergency(
        tx,
        orgA.nurse,
        { ...emergency({ transferDestination: "No corresponde" }), residentId: orgA.residentId },
        NOW,
      ),
    );
    const [row] = await owner
      .select({ destination: schema.emergencies.transferDestination })
      .from(schema.emergencies)
      .where(eq(schema.emergencies.id, id));
    expect(row?.destination).toBeNull();
    expect(
      await domainError(
        withTenant(app, orgA.nurse, (tx) =>
          recordEmergency(
            tx,
            orgA.nurse,
            { ...emergency({ startedDate: "2026-11-05" }), residentId: orgA.residentId },
            NOW,
          ),
        ),
      ),
    ).toBe("La fecha y hora no pueden ser futuras.");
  });
});

describe("Historial del paciente", () => {
  it("incluye sus atenciones y emergencias, sin el texto clínico", async () => {
    const activity = await withTenant(app, orgA.nurse, (tx) =>
      listEntityActivity(tx, { type: "resident", id: orgA.residentId }),
    );
    const actions = activity.map((item) => item.action);
    expect(actions).toContain("care.encounter_recorded");
    expect(actions).toContain("care.encounter_voided");
    expect(actions).toContain("emergency.recorded");
    expect(actions).toContain("emergency.closed");
    expect(JSON.stringify(activity)).not.toContain("cadera");
    // Las de otro paciente o residencia no aparecen.
    const other = await withTenant(app, orgB.nurse, (tx) =>
      listEntityActivity(tx, { type: "resident", id: orgB.residentId }),
    );
    expect(other.map((item) => item.action)).not.toContain("care.encounter_recorded");
  });
});
