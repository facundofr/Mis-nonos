import { and, desc, eq, inArray, lt, or, sql } from "drizzle-orm";

import * as schema from "@/db/schema";
import type { ChangeSet } from "@/lib/audit";
import type { Transaction } from "@/lib/db/client";

/*
 * Historial de cambios (7.3-I, DC-04): lo que se ve en la pestaña Actividad
 * de cada paciente y, más adelante, en la actividad completa. Paginado por
 * cursor (fecha e id), del más nuevo al más viejo.
 */

export interface ActivityItem {
  id: string;
  action: string;
  occurredAt: Date;
  actorName: string | null;
  changes: ChangeSet | null;
  metadata: Record<string, unknown> | null;
}

export async function listEntityActivity(
  tx: Transaction,
  entity: { type: string; id: string },
  options: { limit?: number; before?: Date } = {},
): Promise<ActivityItem[]> {
  const rows = await tx
    .select({
      id: schema.auditEvents.id,
      action: schema.auditEvents.action,
      occurredAt: schema.auditEvents.occurredAt,
      actorName: schema.users.name,
      changes: schema.auditEvents.changes,
      metadata: schema.auditEvents.metadata,
    })
    .from(schema.auditEvents)
    .leftJoin(schema.users, eq(schema.users.id, schema.auditEvents.actorUserId))
    .where(
      and(
        or(
          and(
            eq(schema.auditEvents.entityType, entity.type),
            eq(schema.auditEvents.entityId, entity.id),
          ),
          // El historial de un paciente incluye sus novedades (7.3-I).
          entity.type === "resident"
            ? and(
                eq(schema.auditEvents.entityType, "note"),
                inArray(
                  schema.auditEvents.entityId,
                  tx
                    .select({ id: schema.residentNotes.id })
                    .from(schema.residentNotes)
                    .where(eq(schema.residentNotes.residentId, entity.id)),
                ),
              )
            : undefined,
          // Y sus atenciones y emergencias (qué se hizo y quién, sin el texto: 0017).
          entity.type === "resident"
            ? and(
                inArray(schema.auditEvents.entityType, ["care_encounter", "emergency"]),
                sql`${schema.auditEvents.metadata} ->> 'residentId' = ${entity.id}`,
              )
            : undefined,
        ),
        options.before ? lt(schema.auditEvents.occurredAt, options.before) : undefined,
      ),
    )
    .orderBy(desc(schema.auditEvents.occurredAt), desc(schema.auditEvents.id))
    .limit(options.limit ?? 50);
  return rows.map((row) => ({
    ...row,
    changes: (row.changes ?? null) as ChangeSet | null,
    metadata: (row.metadata ?? null) as Record<string, unknown> | null,
  }));
}

export interface RecentActivityItem extends ActivityItem {
  entityType: string;
  residentId: string | null;
  residentName: string | null;
}

/**
 * Actividad reciente de toda la residencia (Inicio de Dirección, 7.3-H).
 * Solo para quien tiene audit.read_all. Si el cambio es de un paciente (o
 * de una de sus novedades), trae su nombre para enlazarlo.
 */
export async function listRecentActivity(
  tx: Transaction,
  limit = 8,
): Promise<RecentActivityItem[]> {
  const residentId = sql<string | null>`coalesce(
    case when ${schema.auditEvents.entityType} = 'resident' then ${schema.auditEvents.entityId} end,
    (${schema.auditEvents.metadata} ->> 'residentId')::uuid
  )`;
  const rows = await tx
    .select({
      id: schema.auditEvents.id,
      action: schema.auditEvents.action,
      occurredAt: schema.auditEvents.occurredAt,
      actorName: schema.users.name,
      changes: schema.auditEvents.changes,
      metadata: schema.auditEvents.metadata,
      entityType: schema.auditEvents.entityType,
      residentId: schema.residents.id,
      firstName: schema.residents.firstName,
      lastName: schema.residents.lastName,
    })
    .from(schema.auditEvents)
    .leftJoin(schema.users, eq(schema.users.id, schema.auditEvents.actorUserId))
    .leftJoin(schema.residents, eq(schema.residents.id, residentId))
    .orderBy(desc(schema.auditEvents.occurredAt), desc(schema.auditEvents.id))
    .limit(limit);
  return rows.map(({ firstName, lastName, ...row }) => ({
    ...row,
    changes: (row.changes ?? null) as ChangeSet | null,
    metadata: (row.metadata ?? null) as Record<string, unknown> | null,
    residentName: firstName && lastName ? `${firstName} ${lastName}` : null,
  }));
}
