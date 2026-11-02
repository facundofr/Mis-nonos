import * as schema from "@/db/schema";
import type { Transaction } from "@/lib/db/client";

export interface DomainEventInput {
  /** Hecho del dominio en pasado: "fee.charge_due_soon", "note.created". */
  type: string;
  entityType: string;
  entityId?: string | null;
  siteId?: string | null;
  /**
   * Lo mínimo para procesarlo (identificadores, no datos personales
   * completos): el worker busca el resto con permisos (sección 11.1).
   */
  payload?: Record<string, unknown>;
}

const TYPE_PATTERN = /^[a-z][a-z_]*\.[a-z][a-z_]*$/;

/**
 * Agrega un evento de dominio (E8, patrón outbox) en la misma transacción
 * que el cambio. El worker de pg-boss (Etapa 2.5) los procesa después:
 * notificaciones, avisos del abono, trabajos programados.
 */
export async function emitDomainEvent(
  tx: Transaction,
  actor: { organizationId: string },
  input: DomainEventInput,
): Promise<void> {
  if (!TYPE_PATTERN.test(input.type)) {
    throw new Error(`Tipo de evento inválido: ${input.type}`);
  }
  await tx.insert(schema.domainEvents).values({
    organizationId: actor.organizationId,
    siteId: input.siteId ?? null,
    type: input.type,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    payload: input.payload ?? {},
  });
}
