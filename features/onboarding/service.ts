import { and, count, eq, isNotNull, notInArray, sql } from "drizzle-orm";

import * as schema from "@/db/schema";
import type { Transaction } from "@/lib/db/client";
import type { TenantContext } from "@/lib/db/tenant";

/*
 * Estado de la guía de uso de cada persona (dentro de withTenant; RLS:
 * cada uno ve y marca solo lo suyo). Es una preferencia de pantalla, no un
 * dato de la residencia: no se audita (docs/decisions/0013).
 */

const KEY_PATTERN = /^[a-z][a-z0-9_:-]{1,59}$/;

export async function listSeen(tx: Transaction, userId: string): Promise<Set<string>> {
  const rows = await tx
    .select({ key: schema.userOnboarding.key })
    .from(schema.userOnboarding)
    .where(and(eq(schema.userOnboarding.userId, userId), isNotNull(schema.userOnboarding.seenAt)));
  return new Set(rows.map((row) => row.key));
}

export async function markSeen(tx: Transaction, actor: TenantContext, key: string): Promise<void> {
  if (!KEY_PATTERN.test(key)) throw new Error(`Clave de la guía inválida: ${key}`);
  await tx
    .insert(schema.userOnboarding)
    .values({ organizationId: actor.organizationId, userId: actor.userId, key, seenAt: sql`now()` })
    .onConflictDoUpdate({
      target: [
        schema.userOnboarding.organizationId,
        schema.userOnboarding.userId,
        schema.userOnboarding.key,
      ],
      set: { seenAt: sql`now()` },
    });
}

/** "Volver a ver la guía": todo vuelve a aparecer. */
export async function resetOnboarding(tx: Transaction, actor: TenantContext): Promise<void> {
  await tx
    .update(schema.userOnboarding)
    .set({ seenAt: null })
    .where(eq(schema.userOnboarding.userId, actor.userId));
}

export interface SetupProgress {
  siteDetails: boolean;
  emergencyService: boolean;
  catalogsReviewed: boolean;
  staffAdded: boolean;
  firstAdmission: boolean;
}

/** Lista "Puesta en marcha" de Administración: se completa sola con los datos reales. */
export async function setupProgress(
  tx: Transaction,
  organizationId: string,
  site: { phone: string | null; address: string | null; emergencyServicePhone: string | null },
  seen: ReadonlySet<string>,
  catalogsKey: string,
): Promise<SetupProgress> {
  const [members] = await tx
    .select({ value: count() })
    .from(schema.organizationMemberships)
    .where(
      and(
        // RLS también deja ver las membresías propias en otras residencias.
        eq(schema.organizationMemberships.organizationId, organizationId),
        eq(schema.organizationMemberships.status, "active"),
      ),
    );
  const [residents] = await tx
    .select({ value: count() })
    .from(schema.residents)
    .where(notInArray(schema.residents.status, ["admission_draft", "admission_cancelled"]));
  return {
    siteDetails: Boolean(site.phone && site.address),
    emergencyService: Boolean(site.emergencyServicePhone),
    catalogsReviewed: seen.has(catalogsKey),
    staffAdded: (members?.value ?? 0) >= 2,
    firstAdmission: (residents?.value ?? 0) >= 1,
  };
}
