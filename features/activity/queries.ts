import { and, desc, eq, gte, ilike, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import * as schema from "@/db/schema";
import type { ChangeSet } from "@/lib/audit";
import type { Transaction } from "@/lib/db/client";

import { LOG_GROUP_PATTERNS, type LogGroup } from "./log-groups";

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

export interface AuditLogItem extends RecentActivityItem {
  /** La persona sobre la que se hizo el cambio, si es un usuario. */
  targetMembershipId: string | null;
  targetName: string | null;
}

export interface AuditLogFilters {
  actorUserId?: string | null;
  group?: LogGroup | null;
  /** Desde y hasta, como instantes (el día local ya convertido). */
  from?: Date | null;
  until?: Date | null;
  /** Busca en el nombre de quien actuó, del paciente o de la persona. */
  search?: string | null;
}

/**
 * Registro completo de cambios de la residencia (Master, docs/decisions/0021):
 * todo lo auditado, con filtros. Pide una fila de más para saber si hay
 * otra página.
 */
export async function listAuditLog(
  tx: Transaction,
  filters: AuditLogFilters,
  page: { limit: number; offset: number },
): Promise<{ items: AuditLogItem[]; hasMore: boolean }> {
  const residentId = sql<string | null>`coalesce(
    case when ${schema.auditEvents.entityType} = 'resident' then ${schema.auditEvents.entityId} end,
    (${schema.auditEvents.metadata} ->> 'residentId')::uuid
  )`;
  const target = alias(schema.organizationMemberships, "target_membership");
  const targetUser = alias(schema.users, "target_user");

  let groupCondition: SQL | undefined;
  if (filters.group === "altas") {
    groupCondition = and(
      ...Object.values(LOG_GROUP_PATTERNS).map(
        (pattern) => sql`${schema.auditEvents.action} !~ ${pattern}`,
      ),
    );
  } else if (filters.group) {
    groupCondition = sql`${schema.auditEvents.action} ~ ${LOG_GROUP_PATTERNS[filters.group]}`;
  }

  const search = filters.search?.trim();
  const like = search ? `%${search.replace(/[\\%_]/g, (char) => `\\${char}`)}%` : null;

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
      targetMembershipId: target.id,
      targetName: targetUser.name,
    })
    .from(schema.auditEvents)
    .leftJoin(schema.users, eq(schema.users.id, schema.auditEvents.actorUserId))
    .leftJoin(schema.residents, eq(schema.residents.id, residentId))
    .leftJoin(
      target,
      and(
        eq(schema.auditEvents.entityType, "membership"),
        eq(target.id, schema.auditEvents.entityId),
      ),
    )
    .leftJoin(targetUser, eq(targetUser.id, target.userId))
    .where(
      and(
        filters.actorUserId ? eq(schema.auditEvents.actorUserId, filters.actorUserId) : undefined,
        groupCondition,
        filters.from ? gte(schema.auditEvents.occurredAt, filters.from) : undefined,
        filters.until ? lt(schema.auditEvents.occurredAt, filters.until) : undefined,
        like
          ? or(
              ilike(schema.users.name, like),
              ilike(targetUser.name, like),
              sql`(${schema.residents.firstName} || ' ' || ${schema.residents.lastName}) ilike ${like}`,
            )
          : undefined,
      ),
    )
    .orderBy(desc(schema.auditEvents.occurredAt), desc(schema.auditEvents.id))
    .limit(page.limit + 1)
    .offset(page.offset);

  const items = rows.slice(0, page.limit).map(({ firstName, lastName, ...row }) => ({
    ...row,
    changes: (row.changes ?? null) as ChangeSet | null,
    metadata: (row.metadata ?? null) as Record<string, unknown> | null,
    residentName: firstName && lastName ? `${firstName} ${lastName}` : null,
  }));
  return { items, hasMore: rows.length > page.limit };
}
