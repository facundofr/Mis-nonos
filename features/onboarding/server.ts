import "server-only";

import { cache } from "react";

import type { AppContext } from "@/lib/auth/session";
import { getDb, withTenant } from "@/lib/db";

import { listSeen } from "./service";

// Una vez por pedido: lo usan el marco de la app y los consejos de cada
// pantalla. Las claves son textos para que React las compare.
const loadSeen = cache((organizationId: string, userId: string): Promise<Set<string>> =>
  withTenant(getDb(), { organizationId, userId }, (tx) => listSeen(tx, userId)),
);

/** Qué partes de la guía ya vio la persona en esta residencia. */
export function getSeenOnboarding(context: AppContext): Promise<Set<string>> {
  return loadSeen(context.tenant.organizationId, context.tenant.userId);
}
