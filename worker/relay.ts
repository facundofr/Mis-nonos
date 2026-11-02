import { asc, inArray, isNull, sql } from "drizzle-orm";
import { fromDrizzle, type SendOptions } from "pg-boss";

import * as schema from "@/db/schema";
import type { Database } from "@/lib/db/client";
import type { DomainEventJobData } from "@/lib/jobs/queues";

/** Lo que el relay necesita de pg-boss (permite probarlo sin la cola real). */
export interface JobSender {
  send(name: string, data: object, options: SendOptions): Promise<string | null>;
}

type DomainEventRow = typeof schema.domainEvents.$inferSelect;

export function toJobData(event: DomainEventRow): DomainEventJobData {
  return {
    eventId: event.id,
    organizationId: event.organizationId,
    siteId: event.siteId,
    type: event.type,
    entityType: event.entityType,
    entityId: event.entityId,
    payload: (event.payload ?? {}) as Record<string, unknown>,
    occurredAt: event.occurredAt.toISOString(),
  };
}

/**
 * Pasa los eventos de dominio pendientes a la cola (E8, patrón outbox).
 *
 * Todo ocurre en una sola transacción con el rol del worker: se bloquean
 * los eventos pendientes (SKIP LOCKED, así dos workers no toman los
 * mismos), se crean los trabajos de cada suscriptor con la misma
 * transacción (fromDrizzle) y se marcan como procesados. Si algo falla,
 * no queda nada a medias: ni trabajos sin evento marcado ni eventos
 * marcados sin trabajo.
 *
 * Devuelve cuántos eventos procesó.
 */
export async function relayDomainEvents(
  db: Database,
  boss: JobSender,
  subscriptions: Readonly<Record<string, readonly string[]>>,
  batchSize = 100,
): Promise<number> {
  return db.transaction(async (tx) => {
    const events = await tx
      .select()
      .from(schema.domainEvents)
      .where(isNull(schema.domainEvents.processedAt))
      .orderBy(asc(schema.domainEvents.occurredAt))
      .limit(batchSize)
      .for("update", { skipLocked: true });
    if (events.length === 0) return 0;

    const jobDb = fromDrizzle(tx, sql);
    for (const event of events) {
      for (const queue of subscriptions[event.type] ?? []) {
        await boss.send(queue, toJobData(event), { db: jobDb });
      }
    }

    await tx
      .update(schema.domainEvents)
      .set({ processedAt: sql`now()` })
      .where(
        inArray(
          schema.domainEvents.id,
          events.map((event) => event.id),
        ),
      );
    return events.length;
  });
}
