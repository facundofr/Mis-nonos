import { sql } from "drizzle-orm";
import { z } from "zod";

import type { Database, Transaction } from "./client";

const uuidSchema = z.uuid();

export interface TenantContext {
  /** Organización validada en el servidor; nunca la que manda el navegador. */
  organizationId: string;
  /** Usuario autenticado que actúa. */
  userId: string;
}

/**
 * Ejecuta `fn` en una transacción con el contexto de la organización y del
 * usuario (sección 10.13). Las políticas RLS solo dejan ver y escribir filas
 * de esa organización. El contexto vale solo dentro de la transacción: no
 * queda en la conexión cuando el pool la reutiliza para otro pedido.
 */
export async function withTenant<T>(
  db: Database,
  context: TenantContext,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  const organizationId = uuidSchema.parse(context.organizationId);
  const userId = uuidSchema.parse(context.userId);

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.org_id', ${organizationId}, true), set_config('app.user_id', ${userId}, true)`,
    );
    return fn(tx);
  });
}

/**
 * Contexto de una organización sin persona: para el worker (avisos, trabajos
 * programados). Las políticas RLS siguen limitando todo a esa organización;
 * las que dependen de la persona (por ejemplo, ver las membresías propias de
 * otras residencias) no devuelven nada. La auditoría registra al sistema
 * como autor (actor_user_id nulo).
 */
export async function withSystemTenant<T>(
  db: Database,
  organizationId: string,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  const validOrganizationId = uuidSchema.parse(organizationId);

  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.org_id', ${validOrganizationId}, true)`);
    return fn(tx);
  });
}

/**
 * Contexto de usuario sin organización, para el momento del ingreso: permite
 * leer las membresías propias y las residencias en las que trabaja, y nada más.
 */
export async function withUserContext<T>(
  db: Database,
  userId: string,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  const validUserId = uuidSchema.parse(userId);

  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${validUserId}, true)`);
    return fn(tx);
  });
}
