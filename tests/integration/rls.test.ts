import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import * as schema from "@/db/schema";
import { createDb, createPool } from "@/lib/db/client";
import { withTenant, withUserContext } from "@/lib/db/tenant";

// Pruebas de la sección 10.13: sin contexto no se ve nada, y la
// organización A no lee ni escribe datos de la B. Todos los datos son ficticios.

const { ownerUrl, appUrl } = inject("databaseUrls");

const ownerPool = createPool(ownerUrl, { application_name: "pruebas-dueno" });
const appPool = createPool(appUrl, { application_name: "pruebas-app" });
const owner = createDb(ownerPool);
const app = createDb(appPool);

afterAll(async () => {
  await Promise.all([ownerPool.end(), appPool.end()]);
});

function first<T>(rows: T[]): T {
  const row = rows[0];
  if (row === undefined) throw new Error("La consulta no devolvió filas");
  return row;
}

/** Devuelve el error de PostgreSQL (Drizzle lo envuelve en `cause`). */
async function pgError(operation: Promise<unknown>): Promise<{ code?: string; message: string }> {
  try {
    await operation;
  } catch (error) {
    const cause = (error as { cause?: unknown }).cause ?? error;
    return cause as { code?: string; message: string };
  }
  throw new Error("Se esperaba un error de PostgreSQL, pero la operación funcionó");
}

const ids = {
  orgA: "",
  orgB: "",
  siteA: "",
  siteB: "",
  userA: "",
  userB: "",
  userAB: "",
  role: "",
};

beforeAll(async () => {
  // El rol dueño no está sujeto a RLS: prepara los datos de las dos residencias.
  const [orgA, orgB] = await owner
    .insert(schema.organizations)
    .values([{ name: "Residencia A (prueba)" }, { name: "Residencia B (prueba)" }])
    .returning({ id: schema.organizations.id });
  ids.orgA = orgA!.id;
  ids.orgB = orgB!.id;

  ids.siteA = first(
    await owner
      .insert(schema.sites)
      .values({ organizationId: ids.orgA, name: "Sede A" })
      .returning({ id: schema.sites.id }),
  ).id;
  ids.siteB = first(
    await owner
      .insert(schema.sites)
      .values({ organizationId: ids.orgB, name: "Sede B" })
      .returning({ id: schema.sites.id }),
  ).id;

  const [userA, userB, userAB] = await owner
    .insert(schema.users)
    .values([
      { name: "Persona A", email: "a@prueba.test" },
      { name: "Persona B", email: "b@prueba.test" },
      { name: "Persona AB", email: "ab@prueba.test" },
    ])
    .returning({ id: schema.users.id });
  ids.userA = userA!.id;
  ids.userB = userB!.id;
  ids.userAB = userAB!.id;

  ids.role = first(
    await owner
      .insert(schema.roles)
      .values({ key: "rol-de-prueba", name: "Rol de prueba" })
      .returning({ id: schema.roles.id }),
  ).id;

  await owner.insert(schema.organizationMemberships).values([
    { organizationId: ids.orgA, userId: ids.userA, roleId: ids.role },
    { organizationId: ids.orgB, userId: ids.userB, roleId: ids.role },
    { organizationId: ids.orgA, userId: ids.userAB, roleId: ids.role },
    { organizationId: ids.orgB, userId: ids.userAB, roleId: ids.role },
  ]);
});

const contextA = () => ({ organizationId: ids.orgA, userId: ids.userA });

describe("Rol de la app", () => {
  it("no es superusuario, no saltea RLS y no es dueño de ninguna tabla", async () => {
    const role = await app.execute(
      sql`select rolsuper, rolbypassrls from pg_roles where rolname = current_user`,
    );
    expect(role.rows).toEqual([{ rolsuper: false, rolbypassrls: false }]);

    const owned = await app.execute(
      sql`select count(*)::int as total from pg_tables where schemaname = 'public' and tableowner = current_user`,
    );
    expect(owned.rows).toEqual([{ total: 0 }]);
  });
});

describe("Sin contexto", () => {
  it("la app no ve organizaciones, sedes, membresías ni auditoría", async () => {
    expect(await app.select().from(schema.organizations)).toEqual([]);
    expect(await app.select().from(schema.sites)).toEqual([]);
    expect(await app.select().from(schema.organizationMemberships)).toEqual([]);
    expect(await app.select().from(schema.auditEvents)).toEqual([]);
  });

  it("el contexto de una transacción no queda en la conexión reutilizada", async () => {
    const singlePool = createPool(appUrl, { max: 1, application_name: "pruebas-una-conexion" });
    const single = createDb(singlePool);
    try {
      const inside = await withTenant(single, contextA(), (tx) => tx.select().from(schema.sites));
      expect(inside).toHaveLength(1);

      // Misma conexión física, ya fuera de la transacción.
      expect(await single.select().from(schema.sites)).toEqual([]);
      const context = await single.execute(sql`select app.current_org_id() as org`);
      expect(context.rows).toEqual([{ org: null }]);
    } finally {
      await singlePool.end();
    }
  });

  it("rechaza un contexto con un identificador que no es UUID", async () => {
    await expect(
      withTenant(app, { organizationId: "no-es-un-uuid", userId: ids.userA }, async () => 1),
    ).rejects.toThrow();
  });
});

describe("Aislamiento entre residencias", () => {
  it("con el contexto de A solo se ve la sede de A", async () => {
    const rows = await withTenant(app, contextA(), (tx) =>
      tx.select({ id: schema.sites.id }).from(schema.sites),
    );
    expect(rows.map((row) => row.id)).toEqual([ids.siteA]);
  });

  it("no se puede cambiar la sede de otra residencia", async () => {
    const updated = await withTenant(app, contextA(), (tx) =>
      tx
        .update(schema.sites)
        .set({ name: "Cambio no permitido" })
        .where(eq(schema.sites.id, ids.siteB))
        .returning({ id: schema.sites.id }),
    );
    expect(updated).toEqual([]);

    const siteB = first(
      await owner
        .select({ name: schema.sites.name })
        .from(schema.sites)
        .where(eq(schema.sites.id, ids.siteB)),
    );
    expect(siteB.name).toBe("Sede B");
  });

  it("no se puede pasar una sede propia a otra residencia", async () => {
    const error = await pgError(
      withTenant(app, contextA(), (tx) =>
        tx
          .update(schema.sites)
          .set({ organizationId: ids.orgB })
          .where(eq(schema.sites.id, ids.siteA)),
      ),
    );
    expect(error.code).toBe("42501");
    expect(error.message).toMatch(/row-level security/);
  });

  it("no se pueden crear membresías en otra residencia", async () => {
    const error = await pgError(
      withTenant(app, contextA(), (tx) =>
        tx
          .insert(schema.organizationMemberships)
          .values({ organizationId: ids.orgB, userId: ids.userA, roleId: ids.role }),
      ),
    );
    expect(error.code).toBe("42501");
  });

  it("la sede de una membresía tiene que ser de su misma residencia", async () => {
    const error = await pgError(
      owner.insert(schema.organizationMemberships).values({
        organizationId: ids.orgA,
        siteId: ids.siteB,
        userId: ids.userB,
        roleId: ids.role,
      }),
    );
    expect(error.code).toBe("23503");
  });

  it("no hay borrados físicos: la app no puede borrar sedes", async () => {
    const error = await pgError(
      withTenant(app, contextA(), (tx) =>
        tx.delete(schema.sites).where(eq(schema.sites.id, ids.siteA)),
      ),
    );
    expect(error.code).toBe("42501");
    expect(error.message).toMatch(/permission denied/);
  });
});

describe("Ingreso: contexto de usuario sin residencia", () => {
  it("cada persona ve solo sus membresías, en todas sus residencias", async () => {
    const both = await withUserContext(app, ids.userAB, (tx) =>
      tx
        .select({ organizationId: schema.organizationMemberships.organizationId })
        .from(schema.organizationMemberships),
    );
    expect(both.map((row) => row.organizationId).sort()).toEqual([ids.orgA, ids.orgB].sort());

    const onlyA = await withUserContext(app, ids.userA, (tx) =>
      tx
        .select({ userId: schema.organizationMemberships.userId })
        .from(schema.organizationMemberships),
    );
    expect(onlyA).toEqual([{ userId: ids.userA }]);
  });

  it("ve las residencias donde trabaja y no las demás", async () => {
    const rows = await withUserContext(app, ids.userA, (tx) =>
      tx.select({ id: schema.organizations.id }).from(schema.organizations),
    );
    expect(rows.map((row) => row.id)).toEqual([ids.orgA]);
  });
});

describe("Auditoría de solo agregado", () => {
  it("se puede registrar y leer en la propia residencia", async () => {
    await withTenant(app, contextA(), (tx) =>
      tx.insert(schema.auditEvents).values({
        organizationId: ids.orgA,
        actorUserId: ids.userA,
        action: "test.created",
        entityType: "test",
      }),
    );
    const rows = await withTenant(app, contextA(), (tx) =>
      tx.select({ action: schema.auditEvents.action }).from(schema.auditEvents),
    );
    expect(rows).toEqual([{ action: "test.created" }]);
  });

  it("no se puede modificar ni borrar", async () => {
    const update = await pgError(
      withTenant(app, contextA(), (tx) =>
        tx.update(schema.auditEvents).set({ action: "alterado" }),
      ),
    );
    expect(update.code).toBe("42501");

    const remove = await pgError(
      withTenant(app, contextA(), (tx) => tx.delete(schema.auditEvents)),
    );
    expect(remove.code).toBe("42501");
  });

  it("no se puede escribir en la auditoría de otra residencia", async () => {
    const error = await pgError(
      withTenant(app, contextA(), (tx) =>
        tx.insert(schema.auditEvents).values({
          organizationId: ids.orgB,
          action: "test.created",
          entityType: "test",
        }),
      ),
    );
    expect(error.code).toBe("42501");
  });
});
