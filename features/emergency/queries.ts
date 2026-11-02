import { and, eq, inArray, isNotNull } from "drizzle-orm";

import * as schema from "@/db/schema";
import type { Transaction } from "@/lib/db/client";

import { listAllergies, listContacts } from "../residents/queries";

/*
 * Ficha de emergencia (7.3-E, 6.9): todo lo que hace falta en una urgencia,
 * en una sola consulta. Solo pacientes activos o internados fuera.
 */

export async function loadEmergencySheet(tx: Transaction, residentId: string) {
  const [resident] = await tx
    .select()
    .from(schema.residents)
    .where(
      and(
        eq(schema.residents.id, residentId),
        inArray(schema.residents.status, ["active", "hospitalized"]),
      ),
    );
  if (!resident) return null;
  const [site] = await tx.select().from(schema.sites).where(eq(schema.sites.id, resident.siteId));
  const allergies = await listAllergies(tx, residentId);
  const contacts = (await listContacts(tx, residentId)).filter(
    (contact) => contact.emergencyPriority !== null,
  );
  return { resident, site: site!, allergies, contacts };
}

export type EmergencySheet = NonNullable<Awaited<ReturnType<typeof loadEmergencySheet>>>;

/** Personas activas de la residencia con alguno de estos roles (para avisos). */
export async function activeMembersWithRoles(
  tx: Transaction,
  organizationId: string,
  roleKeys: string[],
): Promise<{ userId: string; name: string }[]> {
  return tx
    .select({ userId: schema.users.id, name: schema.users.name })
    .from(schema.organizationMemberships)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.organizationMemberships.roleId))
    .innerJoin(schema.users, eq(schema.users.id, schema.organizationMemberships.userId))
    .where(
      and(
        eq(schema.organizationMemberships.organizationId, organizationId),
        eq(schema.organizationMemberships.status, "active"),
        inArray(schema.roles.key, roleKeys),
        isNotNull(schema.users.id),
      ),
    );
}
