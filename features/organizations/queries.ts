import { and, asc, eq } from "drizzle-orm";

import * as schema from "@/db/schema";
import type { Transaction } from "@/lib/db/client";

/*
 * Lecturas de la residencia y su sede. Corren dentro de withTenant: RLS
 * deja ver solo la organización de la transacción.
 */

export type SiteRow = typeof schema.sites.$inferSelect;
export type ShiftRow = typeof schema.shifts.$inferSelect;

/**
 * Sede de trabajo: la de la membresía o, si la persona trabaja en todas
 * (site_id nulo), la primera sede activa. En el MVP hay una sola.
 */
export async function findWorkSite(
  tx: Transaction,
  siteId: string | null,
): Promise<SiteRow | null> {
  const [site] = await tx
    .select()
    .from(schema.sites)
    .where(siteId ? eq(schema.sites.id, siteId) : eq(schema.sites.status, "active"))
    .orderBy(asc(schema.sites.createdAt))
    .limit(1);
  return site ?? null;
}

export async function listShifts(
  tx: Transaction,
  siteId: string,
  options: { includeInactive?: boolean } = {},
): Promise<ShiftRow[]> {
  return tx
    .select()
    .from(schema.shifts)
    .where(
      options.includeInactive
        ? eq(schema.shifts.siteId, siteId)
        : and(eq(schema.shifts.siteId, siteId), eq(schema.shifts.active, true)),
    )
    .orderBy(asc(schema.shifts.position), asc(schema.shifts.startsAt));
}

export async function findOrganization(tx: Transaction, organizationId: string) {
  const [organization] = await tx
    .select({ id: schema.organizations.id, name: schema.organizations.name })
    .from(schema.organizations)
    .where(eq(schema.organizations.id, organizationId));
  return organization ?? null;
}
