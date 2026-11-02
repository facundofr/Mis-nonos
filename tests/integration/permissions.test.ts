import { randomUUID } from "node:crypto";

import { eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import * as schema from "@/db/schema";
import { diffChanges, recordAudit } from "@/lib/audit";
import { queryPermissions } from "@/lib/auth/permission-queries";
import { PERMISSION_KEYS, PERMISSIONS, rolePermissionPairs } from "@/lib/auth/permissions";
import { createDb, createPool } from "@/lib/db/client";
import { withTenant } from "@/lib/db/tenant";
import { emitDomainEvent } from "@/lib/events";

// Etapa 2.4: permisos como datos (F.3), módulos activables, auditoría con
// valores anteriores y nuevos (DC-04) y eventos de dominio. Datos ficticios.

const { ownerUrl, appUrl } = inject("databaseUrls");
const ownerPool = createPool(ownerUrl, { application_name: "pruebas-permisos-dueno" });
const appPool = createPool(appUrl, { application_name: "pruebas-permisos-app" });
const owner = createDb(ownerPool);
const app = createDb(appPool);

const ids = { orgA: "", orgB: "", roles: {} as Record<string, string> };
const someone = randomUUID();

/** Devuelve el error de PostgreSQL (Drizzle lo envuelve en `cause`). */
async function pgError(operation: Promise<unknown>): Promise<{ code?: string }> {
  try {
    await operation;
  } catch (error) {
    return ((error as { cause?: unknown }).cause ?? error) as { code?: string };
  }
  throw new Error("Se esperaba un error de PostgreSQL");
}

afterAll(async () => {
  await Promise.all([ownerPool.end(), appPool.end()]);
});

beforeAll(async () => {
  const [orgA, orgB] = await owner
    .insert(schema.organizations)
    .values([{ name: "Residencia A (permisos)" }, { name: "Residencia B (permisos)" }])
    .returning({ id: schema.organizations.id });
  ids.orgA = orgA!.id;
  ids.orgB = orgB!.id;

  // A tiene solo el núcleo; B tiene además el abono.
  await owner.insert(schema.organizationModules).values([
    { organizationId: ids.orgA, moduleKey: "core", enabled: true },
    { organizationId: ids.orgA, moduleKey: "fees", enabled: false },
    { organizationId: ids.orgB, moduleKey: "core", enabled: true },
    { organizationId: ids.orgB, moduleKey: "fees", enabled: true },
  ]);

  const roles = await owner
    .select({ id: schema.roles.id, key: schema.roles.key })
    .from(schema.roles)
    .where(isNull(schema.roles.organizationId));
  for (const role of roles) ids.roles[role.key] = role.id;
});

describe("Matriz en la base", () => {
  it("el catálogo de permisos es el del código", async () => {
    const rows = await owner.select().from(schema.permissions);
    expect(rows.map((row) => `${row.key}:${row.moduleKey}`).sort()).toEqual(
      PERMISSION_KEYS.map((key) => `${key}:${PERMISSIONS[key].module}`).sort(),
    );
  });

  it("los pares rol-permiso son los de F.3", async () => {
    const rows = await owner
      .select({ role: schema.roles.key, permission: schema.rolePermissions.permissionKey })
      .from(schema.rolePermissions)
      .innerJoin(schema.roles, eq(schema.roles.id, schema.rolePermissions.roleId))
      .where(isNull(schema.roles.organizationId));
    expect(rows.map((row) => `${row.permission}:${row.role}`).sort()).toEqual(
      rolePermissionPairs()
        .map((pair) => `${pair.permission}:${pair.role}`)
        .sort(),
    );
  });

  it("la app no puede cambiar permisos", async () => {
    const error = await pgError(
      withTenant(app, { organizationId: ids.orgA, userId: someone }, (tx) =>
        tx
          .insert(schema.rolePermissions)
          .values({ roleId: ids.roles.cuidado!, permissionKey: "users.manage" }),
      ),
    );
    expect(error.code).toBe("42501");
  });
});

describe("Permisos efectivos (rol + módulos activos)", () => {
  const permissionsOf = (organizationId: string, role: string) =>
    queryPermissions(app, { organizationId, userId: someone, roleId: ids.roles[role]! });

  it("sin el módulo del abono, Administración no ve montos", async () => {
    const admin = await permissionsOf(ids.orgA, "admin");
    expect(admin.has("users.manage")).toBe(true);
    expect(admin.has("fees.read")).toBe(false);
    expect(admin.size).toBe(19);
  });

  it("con el módulo del abono activo, sí", async () => {
    const admin = await permissionsOf(ids.orgB, "admin");
    expect(admin.has("fees.read")).toBe(true);
    expect(admin.size).toBe(21);
  });

  it("Cuidado no edita datos ni ve montos aunque el módulo esté activo", async () => {
    const cuidado = await permissionsOf(ids.orgB, "cuidado");
    expect(cuidado.has("residents.read")).toBe(true);
    expect(cuidado.has("residents.update")).toBe(false);
    expect(cuidado.has("fees.read")).toBe(false);
    expect(cuidado.size).toBe(10);
  });

  it("los módulos de otra residencia no cuentan", async () => {
    // B tiene el abono activo; con el contexto de A no se ve.
    const modules = await withTenant(app, { organizationId: ids.orgA, userId: someone }, (tx) =>
      tx.select().from(schema.organizationModules),
    );
    expect(modules.every((module) => module.organizationId === ids.orgA)).toBe(true);
  });
});

describe("Auditoría y eventos de dominio", () => {
  it("guarda los valores anteriores y nuevos en la propia residencia", async () => {
    const entityId = randomUUID();
    await withTenant(app, { organizationId: ids.orgA, userId: someone }, (tx) =>
      recordAudit(
        tx,
        { organizationId: ids.orgA, userId: null },
        {
          action: "resident.updated",
          entityType: "resident",
          entityId,
          changes: diffChanges({ phone: "111" }, { phone: "222" }),
        },
      ),
    );
    const [row] = await owner
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.entityId, entityId));
    expect(row?.changes).toEqual({ phone: { antes: "111", despues: "222" } });
  });

  it("los eventos de dominio quedan en su residencia y la otra no los ve", async () => {
    const entityId = randomUUID();
    await withTenant(app, { organizationId: ids.orgA, userId: someone }, (tx) =>
      emitDomainEvent(
        tx,
        { organizationId: ids.orgA },
        { type: "resident.updated", entityType: "resident", entityId, payload: { campos: 1 } },
      ),
    );
    const fromB = await withTenant(app, { organizationId: ids.orgB, userId: someone }, (tx) =>
      tx.select().from(schema.domainEvents).where(eq(schema.domainEvents.entityId, entityId)),
    );
    expect(fromB).toEqual([]);
    const fromA = await withTenant(app, { organizationId: ids.orgA, userId: someone }, (tx) =>
      tx.select().from(schema.domainEvents).where(eq(schema.domainEvents.entityId, entityId)),
    );
    expect(fromA).toHaveLength(1);
  });
});
