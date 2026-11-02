import { randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import * as schema from "@/db/schema";
import { listDocumentTypes, listNoteCategories } from "@/features/settings/queries";
import { saveShift } from "@/features/settings/service";
import { listMembers } from "@/features/users/queries";
import {
  createMemberWithoutEmail,
  inviteMember,
  setMemberActive,
  updateMember,
} from "@/features/users/service";
import { createDb, createPool } from "@/lib/db/client";
import { withTenant, type TenantContext } from "@/lib/db/tenant";
import { DomainError } from "@/lib/errors";
import { createOrganization } from "@/lib/organizations/create";

// Etapa 3.1: usuarios y roles, y configuración, contra PostgreSQL real.
// Datos ficticios.

const { ownerUrl, appUrl } = inject("databaseUrls");
const ownerPool = createPool(ownerUrl, { application_name: "pruebas-usuarios-dueno" });
const appPool = createPool(appUrl, { application_name: "pruebas-usuarios-app" });
const owner = createDb(ownerPool);
const app = createDb(appPool);

interface Org {
  organizationId: string;
  siteId: string;
  admin: TenantContext;
  adminMembershipId: string;
}

async function roleId(key: string): Promise<string> {
  const [role] = await owner
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .where(and(eq(schema.roles.key, key), isNull(schema.roles.organizationId)));
  return role!.id;
}

/** Residencia con una persona de Administración activa (como después del alta). */
async function setupOrganization(name: string): Promise<Org> {
  const created = await owner.transaction((tx) =>
    createOrganization(tx, {
      organizationName: name,
      siteName: "Sede central",
      adminEmail: `admin-${randomUUID()}@prueba.test`,
      adminName: "Administración de prueba",
    }),
  );
  const [user] = await owner
    .insert(schema.users)
    .values({ name: "Laura Pereyra", email: `laura-${randomUUID()}@prueba.test` })
    .returning({ id: schema.users.id });
  const [membership] = await owner
    .insert(schema.organizationMemberships)
    .values({
      organizationId: created.organizationId,
      userId: user!.id,
      roleId: await roleId("admin"),
      status: "active",
    })
    .returning({ id: schema.organizationMemberships.id });
  return {
    organizationId: created.organizationId,
    siteId: created.siteId,
    admin: { organizationId: created.organizationId, userId: user!.id },
    adminMembershipId: membership!.id,
  };
}

let orgA: Org;
let orgB: Org;

beforeAll(async () => {
  orgA = await setupOrganization("Residencia A (usuarios)");
  orgB = await setupOrganization("Residencia B (usuarios)");
});

afterAll(async () => {
  await Promise.all([ownerPool.end(), appPool.end()]);
});

async function domainError(operation: Promise<unknown>): Promise<string> {
  try {
    await operation;
  } catch (error) {
    if (error instanceof DomainError) return error.message;
    throw error;
  }
  throw new Error("Se esperaba un DomainError");
}

const asA = <T>(fn: Parameters<typeof withTenant<T>>[2]) => withTenant(app, orgA.admin, fn);

async function newCaregiver(org: Org, name = "Marta Gómez") {
  return withTenant(app, org.admin, (tx) =>
    createMemberWithoutEmail(tx, org.admin, {
      name,
      username: `marta.${randomUUID().slice(0, 8)}`,
      roleKey: "cuidado",
      phone: null,
      profession: null,
      licenseNumber: null,
      passwordHash: "hash-ficticio",
    }),
  );
}

describe("Alta de una residencia", () => {
  it("carga los turnos, las categorías y los documentos iniciales", async () => {
    const { categories, documents, shifts } = await asA(async (tx) => ({
      categories: await listNoteCategories(tx),
      documents: await listDocumentTypes(tx),
      shifts: await tx.select().from(schema.shifts),
    }));
    expect(shifts.map((shift) => shift.name)).toEqual(["Mañana", "Tarde", "Noche"]);
    expect(categories).toHaveLength(6);
    expect(documents.filter((document) => document.required)).toHaveLength(6);
  });
});

describe("Usuarios y roles", () => {
  it("crea a alguien sin email con contraseña provisoria y lo audita sin la contraseña", async () => {
    const { membershipId, userId } = await newCaregiver(orgA);
    const [user] = await owner.select().from(schema.users).where(eq(schema.users.id, userId));
    expect(user?.email).toMatch(/@sin-email\.invalid$/);
    expect(user?.passwordChangeRequired).toBe(true);
    const [audit] = await owner
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.entityId, membershipId));
    expect(audit?.action).toBe("user.created");
    expect(JSON.stringify(audit)).not.toContain("hash-ficticio");
  });

  it("no invita a quien ya trabaja en la residencia", async () => {
    const [admin] = await owner
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, orgA.admin.userId));
    const message = await domainError(
      asA((tx) =>
        inviteMember(tx, orgA.admin, {
          name: "Laura Pereyra",
          email: admin!.email,
          roleKey: "cuidado",
          phone: null,
          profession: null,
          licenseNumber: null,
        }),
      ),
    );
    expect(message).toBe("Esa persona ya trabaja en la residencia.");
  });

  it("nadie cambia su propio rol ni deja la residencia sin Administración", async () => {
    const ownRole = await domainError(
      asA((tx) =>
        updateMember(tx, orgA.admin, orgA.adminMembershipId, {
          roleKey: "direccion",
          phone: null,
          profession: null,
          licenseNumber: null,
          usualShiftId: null,
        }),
      ),
    );
    expect(ownRole).toBe("No podés cambiar tu propio rol.");
    expect(
      await domainError(
        asA((tx) => setMemberActive(tx, orgA.admin, orgA.adminMembershipId, false)),
      ),
    ).toBe("No podés desactivarte a vos mismo.");
  });

  it("desactivar cierra las sesiones de esa persona en la residencia", async () => {
    const { membershipId, userId } = await newCaregiver(orgA, "Héctor Benítez");
    await owner.insert(schema.sessions).values({
      userId,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 3_600_000),
      activeOrganizationId: orgA.organizationId,
    });
    await asA((tx) => setMemberActive(tx, orgA.admin, membershipId, false));
    const sessions = await owner
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.userId, userId));
    expect(sessions).toEqual([]);
    const members = await asA((tx) => listMembers(tx));
    expect(members.find((member) => member.membershipId === membershipId)?.status).toBe("disabled");
  });

  it("Administración de una residencia no ve ni toca a las personas de otra", async () => {
    const { membershipId } = await newCaregiver(orgB);
    const members = await asA((tx) => listMembers(tx));
    expect(members.some((member) => member.membershipId === membershipId)).toBe(false);
    expect(
      await domainError(asA((tx) => setMemberActive(tx, orgA.admin, membershipId, false))),
    ).toBe("Esa persona no está en la residencia.");
  });
});

describe("Turnos", () => {
  const shift = (name: string, startsAt: string, endsAt: string, active = true) => ({
    name,
    startsAt,
    endsAt,
    active,
  });

  it("no acepta turnos activos superpuestos; inactivos sí", async () => {
    expect(
      await domainError(
        asA((tx) =>
          saveShift(tx, orgA.admin, orgA.siteId, null, shift("Refuerzo", "10:00", "12:00")),
        ),
      ),
    ).toMatch(/Se superpone con el turno Mañana/);
    await asA((tx) =>
      saveShift(tx, orgA.admin, orgA.siteId, null, shift("Refuerzo", "10:00", "12:00", false)),
    );
  });

  it("acortar un turno deja lugar para otro", async () => {
    const [morning] = await owner
      .select()
      .from(schema.shifts)
      .where(and(eq(schema.shifts.siteId, orgB.siteId), eq(schema.shifts.name, "Mañana")));
    await withTenant(app, orgB.admin, async (tx) => {
      await saveShift(tx, orgB.admin, orgB.siteId, morning!.id, shift("Mañana", "06:00", "13:00"));
      await saveShift(tx, orgB.admin, orgB.siteId, null, shift("Mediodía", "13:00", "14:00"));
    });
    const names = await owner
      .select({ name: schema.shifts.name })
      .from(schema.shifts)
      .where(eq(schema.shifts.siteId, orgB.siteId))
      .orderBy(schema.shifts.position);
    expect(names.map((row) => row.name)).toEqual(["Mañana", "Mediodía", "Tarde", "Noche"]);
  });
});
