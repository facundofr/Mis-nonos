import { randomUUID } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { PgBoss } from "pg-boss";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import * as schema from "@/db/schema";
import { createDb, createPool } from "@/lib/db/client";
import { withTenant } from "@/lib/db/tenant";
import { emitDomainEvent } from "@/lib/events";
import type { DomainEventJobData } from "@/lib/jobs/queues";
import { cleanupExpiredAuth } from "@/worker/jobs/auth-cleanup";
import { relayDomainEvents } from "@/worker/relay";

// Etapa 2.5: rol del worker, pasaje de eventos de dominio a la cola
// (outbox) y limpieza de credenciales vencidas. Datos ficticios.

const { ownerUrl, appUrl, workerUrl } = inject("databaseUrls");
const ownerPool = createPool(ownerUrl, { application_name: "pruebas-worker-dueno" });
const appPool = createPool(appUrl, { application_name: "pruebas-worker-app" });
const workerPool = createPool(workerUrl, { application_name: "pruebas-worker" });
const owner = createDb(ownerPool);
const app = createDb(appPool);
const worker = createDb(workerPool);

const TEST_QUEUE = "pruebas.eventos";
const TEST_EVENT = "prueba.enviado";
const ids = { orgA: "", orgB: "" };
const someone = randomUUID();

let boss: PgBoss;

async function pgError(operation: Promise<unknown>): Promise<{ code?: string }> {
  try {
    await operation;
  } catch (error) {
    return ((error as { cause?: unknown }).cause ?? error) as { code?: string };
  }
  throw new Error("Se esperaba un error de PostgreSQL");
}

/** Emite un evento con el rol de la app, como lo hace un módulo, y devuelve su id. */
async function emit(organizationId: string, type = TEST_EVENT): Promise<string> {
  const entityId = randomUUID();
  await withTenant(app, { organizationId, userId: someone }, (tx) =>
    emitDomainEvent(tx, { organizationId }, { type, entityType: "prueba", entityId }),
  );
  const [row] = await owner
    .select({ id: schema.domainEvents.id })
    .from(schema.domainEvents)
    .where(eq(schema.domainEvents.entityId, entityId));
  return row!.id;
}

beforeAll(async () => {
  const [orgA, orgB] = await owner
    .insert(schema.organizations)
    .values([{ name: "Residencia A (worker)" }, { name: "Residencia B (worker)" }])
    .returning({ id: schema.organizations.id });
  ids.orgA = orgA!.id;
  ids.orgB = orgB!.id;

  // Igual que en producción: el esquema ya existe y es del rol del worker.
  boss = new PgBoss({
    connectionString: workerUrl,
    schema: "pgboss",
    createSchema: false,
    supervise: false,
    schedule: false,
  });
  await boss.start();
  await boss.createQueue(TEST_QUEUE);
});

afterAll(async () => {
  await boss?.stop({ graceful: false });
  await Promise.all([ownerPool.end(), appPool.end(), workerPool.end()]);
});

describe("Rol del worker", () => {
  it("ve los eventos de dominio de todas las residencias", async () => {
    const [fromA, fromB] = [await emit(ids.orgA), await emit(ids.orgB)];
    const rows = await worker
      .select({ id: schema.domainEvents.id })
      .from(schema.domainEvents)
      .where(inArray(schema.domainEvents.id, [fromA, fromB]));
    expect(rows).toHaveLength(2);
  });

  it("no puede leer otras tablas de la app", async () => {
    for (const table of [schema.organizations, schema.auditEvents, schema.users]) {
      expect((await pgError(worker.select().from(table).limit(1))).code).toBe("42501");
    }
  });

  it("no puede crear eventos ni cambiar otra columna que processed_at", async () => {
    const insert = worker.insert(schema.domainEvents).values({
      organizationId: ids.orgA,
      type: TEST_EVENT,
      entityType: "prueba",
    });
    expect((await pgError(insert)).code).toBe("42501");

    const id = await emit(ids.orgA);
    const update = worker
      .update(schema.domainEvents)
      .set({ type: "otro.tipo" })
      .where(eq(schema.domainEvents.id, id));
    expect((await pgError(update)).code).toBe("42501");
  });

  it("solo puede marcar eventos pendientes", async () => {
    const id = await emit(ids.orgA);
    const first = await worker
      .update(schema.domainEvents)
      .set({ processedAt: new Date() })
      .where(eq(schema.domainEvents.id, id))
      .returning({ id: schema.domainEvents.id });
    expect(first).toHaveLength(1);
    // Ya procesado: la política no lo deja tocar de nuevo.
    const second = await worker
      .update(schema.domainEvents)
      .set({ processedAt: new Date(0) })
      .where(eq(schema.domainEvents.id, id))
      .returning({ id: schema.domainEvents.id });
    expect(second).toHaveLength(0);
  });

  it("la app no puede ver ni tocar la cola de trabajos", async () => {
    const error = await pgError(appPool.query("select count(*) from pgboss.job"));
    expect(error.code).toBe("42501");
  });
});

describe("Pasaje de eventos a la cola (outbox)", () => {
  const subscriptions = { [TEST_EVENT]: [TEST_QUEUE] };

  it("crea un trabajo por suscriptor y marca el evento, en una transacción", async () => {
    const eventId = await emit(ids.orgB);
    // Puede haber eventos pendientes de otras pruebas: se procesan todos.
    while ((await relayDomainEvents(worker, boss, subscriptions)) > 0) {
      // sigue hasta vaciar
    }

    const [event] = await owner
      .select({ processedAt: schema.domainEvents.processedAt })
      .from(schema.domainEvents)
      .where(eq(schema.domainEvents.id, eventId));
    expect(event?.processedAt).toBeInstanceOf(Date);

    const jobs = await boss.findJobs<DomainEventJobData>(TEST_QUEUE, { data: { eventId } });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.data).toMatchObject({
      eventId,
      organizationId: ids.orgB,
      type: TEST_EVENT,
      entityType: "prueba",
    });
  });

  it("no vuelve a enviar un evento ya procesado", async () => {
    const eventId = await emit(ids.orgA);
    while ((await relayDomainEvents(worker, boss, subscriptions)) > 0) {
      // sigue hasta vaciar
    }
    expect(await relayDomainEvents(worker, boss, subscriptions)).toBe(0);
    const jobs = await boss.findJobs(TEST_QUEUE, { data: { eventId } });
    expect(jobs).toHaveLength(1);
  });

  it("si no se puede crear el trabajo, el evento sigue pendiente", async () => {
    const eventId = await emit(ids.orgA);
    const failing = {
      send: async () => {
        throw new Error("cola caída");
      },
    };
    await expect(relayDomainEvents(worker, failing, subscriptions)).rejects.toThrow("cola caída");
    const [event] = await owner
      .select({ processedAt: schema.domainEvents.processedAt })
      .from(schema.domainEvents)
      .where(eq(schema.domainEvents.id, eventId));
    expect(event?.processedAt).toBeNull();
  });
});

describe("Limpieza de credenciales vencidas", () => {
  it("borra sesiones y enlaces vencidos y deja los vigentes", async () => {
    const [user] = await owner
      .insert(schema.users)
      .values({ name: "Persona de Prueba", email: `limpieza-${randomUUID()}@ejemplo.com` })
      .returning({ id: schema.users.id });
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const [expired, valid] = await owner
      .insert(schema.sessions)
      .values([
        { userId: user!.id, token: randomUUID(), expiresAt: new Date(now - 2 * DAY) },
        { userId: user!.id, token: randomUUID(), expiresAt: new Date(now + DAY) },
      ])
      .returning({ id: schema.sessions.id });
    const [oldLink, newLink] = await owner
      .insert(schema.verifications)
      .values([
        { identifier: `prueba:${randomUUID()}`, value: "x", expiresAt: new Date(now - 2 * DAY) },
        { identifier: `prueba:${randomUUID()}`, value: "x", expiresAt: new Date(now + DAY) },
      ])
      .returning({ id: schema.verifications.id });

    const deleted = await cleanupExpiredAuth(app);
    expect(deleted.sessions).toBeGreaterThanOrEqual(1);
    expect(deleted.verifications).toBeGreaterThanOrEqual(1);

    const sessions = await owner
      .select({ id: schema.sessions.id })
      .from(schema.sessions)
      .where(inArray(schema.sessions.id, [expired!.id, valid!.id]));
    expect(sessions.map((row) => row.id)).toEqual([valid!.id]);
    const links = await owner
      .select({ id: schema.verifications.id })
      .from(schema.verifications)
      .where(inArray(schema.verifications.id, [oldLink!.id, newLink!.id]));
    expect(links.map((row) => row.id)).toEqual([newLink!.id]);
  });
});
