import "server-only";

import { cache } from "react";

import {
  findWorkSite,
  listShifts,
  type ShiftRow,
  type SiteRow,
} from "@/features/organizations/queries";
import type { AppContext } from "@/lib/auth/session";
import { getDb, withTenant } from "@/lib/db";
import { currentShift, type ShiftOccurrence } from "@/lib/time/shifts";
import { localDateKey, toLocal } from "@/lib/time/zoned";

export interface SiteContext {
  site: SiteRow;
  shifts: ShiftRow[];
  /** Turno en curso según el reloj y la zona horaria de la sede. */
  current: ShiftOccurrence<ShiftRow> | null;
  /** Fecha de hoy en la sede (AAAA-MM-DD). */
  today: string;
}

// Una vez por pedido; las claves son textos para que React las compare.
const loadSite = cache(
  async (organizationId: string, userId: string, siteId: string | null): Promise<SiteContext> =>
    withTenant(getDb(), { organizationId, userId }, async (tx) => {
      const site = await findWorkSite(tx, siteId);
      if (!site) throw new Error("La residencia no tiene una sede activa.");
      const shifts = await listShifts(tx, site.id);
      const now = new Date();
      return {
        site,
        shifts,
        current: currentShift(shifts, now, site.timezone),
        today: localDateKey(toLocal(now, site.timezone)),
      };
    }),
);

/** Sede de trabajo de la persona, sus turnos y el turno actual. */
export function getSiteContext(context: AppContext): Promise<SiteContext> {
  return loadSite(context.tenant.organizationId, context.tenant.userId, context.membership.siteId);
}
