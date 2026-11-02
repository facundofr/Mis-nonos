import * as schema from "@/db/schema";
import type { Transaction } from "@/lib/db/client";

import type { ChangeSet } from "./changes";

export { diffChanges, REDACTED, type ChangeSet, type FieldChange } from "./changes";

/** Quién actúa y en qué residencia. `userId` nulo = el sistema (trabajos, scripts). */
export interface AuditActor {
  organizationId: string;
  userId: string | null;
}

export interface AuditInput {
  /** Módulo y verbo en pasado: "resident.updated", "emergency.viewed". */
  action: string;
  entityType: string;
  entityId?: string | null;
  siteId?: string | null;
  changes?: ChangeSet | null;
  /** Contexto sin datos sensibles (p. ej. el rol o el motivo). */
  metadata?: Record<string, unknown> | null;
}

const ACTION_PATTERN = /^[a-z][a-z_]*\.[a-z][a-z_]*$/;

/**
 * Registra un evento de auditoría (E7) en la misma transacción que el
 * cambio: si el cambio se deshace, el registro también. La base solo
 * permite agregar: no se puede modificar ni borrar.
 */
export async function recordAudit(
  tx: Transaction,
  actor: AuditActor,
  input: AuditInput,
): Promise<void> {
  if (!ACTION_PATTERN.test(input.action)) {
    throw new Error(`Acción de auditoría inválida: ${input.action}`);
  }
  await tx.insert(schema.auditEvents).values({
    organizationId: actor.organizationId,
    siteId: input.siteId ?? null,
    actorUserId: actor.userId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    changes: input.changes ?? null,
    metadata: input.metadata ?? null,
  });
}
