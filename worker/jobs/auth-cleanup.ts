import { lt, or, sql } from "drizzle-orm";

import * as schema from "@/db/schema";
import type { Database } from "@/lib/db/client";

/**
 * Borra credenciales temporales vencidas (docs/decisions/0003, punto 10):
 * sesiones que ya no abren nada y enlaces de un solo uso vencidos. Corre
 * con el rol de la app, que tiene DELETE solo en estas tablas.
 *
 * Se deja un día de margen para que una sesión recién vencida todavía
 * muestre "Tu sesión venció" en lugar de un ingreso sin explicación.
 */
export async function cleanupExpiredAuth(db: Database): Promise<{
  sessions: number;
  verifications: number;
}> {
  const cutoff = sql`now() - interval '1 day'`;
  const sessions = await db
    .delete(schema.sessions)
    .where(or(lt(schema.sessions.expiresAt, cutoff), lt(schema.sessions.absoluteExpiresAt, cutoff)))
    .returning({ id: schema.sessions.id });
  const verifications = await db
    .delete(schema.verifications)
    .where(lt(schema.verifications.expiresAt, cutoff))
    .returning({ id: schema.verifications.id });
  return { sessions: sessions.length, verifications: verifications.length };
}
