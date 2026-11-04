import {
  aliasedTable,
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  max,
  sql,
} from "drizzle-orm";

import * as schema from "@/db/schema";
import type { Transaction } from "@/lib/db/client";

/*
 * Lecturas del seguimiento del cuidado (dentro de withTenant). La base
 * además exige care.read o emergencies.manage en sus políticas: sin el
 * permiso, estas consultas devuelven listas vacías.
 */

export interface SpecialtyRow {
  id: string;
  name: string;
  active: boolean;
  professionals: number;
  lastEncounterAt: Date | null;
}

export async function listSpecialties(
  tx: Transaction,
  options: { activeOnly?: boolean } = {},
): Promise<SpecialtyRow[]> {
  const professionalsCount = tx
    .select({ specialtyId: schema.professionals.specialtyId, total: count().as("total") })
    .from(schema.professionals)
    .where(eq(schema.professionals.active, true))
    .groupBy(schema.professionals.specialtyId)
    .as("professionals_count");
  const lastEncounter = tx
    .select({
      specialtyId: schema.careEncounters.specialtyId,
      last: max(schema.careEncounters.occurredAt).as("last"),
    })
    .from(schema.careEncounters)
    .where(isNull(schema.careEncounters.voidedAt))
    .groupBy(schema.careEncounters.specialtyId)
    .as("last_encounter");
  const rows = await tx
    .select({
      id: schema.specialties.id,
      name: schema.specialties.name,
      active: schema.specialties.active,
      professionals: sql<number>`coalesce(${professionalsCount.total}, 0)::int`,
      lastEncounterAt: lastEncounter.last,
    })
    .from(schema.specialties)
    .leftJoin(professionalsCount, eq(professionalsCount.specialtyId, schema.specialties.id))
    .leftJoin(lastEncounter, eq(lastEncounter.specialtyId, schema.specialties.id))
    .where(options.activeOnly ? eq(schema.specialties.active, true) : undefined)
    .orderBy(
      desc(schema.specialties.active),
      asc(schema.specialties.position),
      asc(schema.specialties.name),
    );
  return rows.map((row) => ({
    ...row,
    lastEncounterAt: row.lastEncounterAt ? new Date(row.lastEncounterAt) : null,
  }));
}

export async function getSpecialty(tx: Transaction, specialtyId: string) {
  const [row] = await tx
    .select({
      id: schema.specialties.id,
      name: schema.specialties.name,
      active: schema.specialties.active,
    })
    .from(schema.specialties)
    .where(eq(schema.specialties.id, specialtyId));
  return row ?? null;
}

export interface ProfessionalRow {
  id: string;
  name: string;
  kind: string;
  specialtyId: string;
  specialtyName: string;
  licenseNumber: string | null;
  phone: string | null;
  institution: string | null;
  notes: string | null;
  active: boolean;
}

export async function listProfessionals(
  tx: Transaction,
  options: { activeOnly?: boolean; specialtyId?: string } = {},
): Promise<ProfessionalRow[]> {
  return tx
    .select({
      id: schema.professionals.id,
      name: schema.professionals.name,
      kind: schema.professionals.kind,
      specialtyId: schema.professionals.specialtyId,
      specialtyName: schema.specialties.name,
      licenseNumber: schema.professionals.licenseNumber,
      phone: schema.professionals.phone,
      institution: schema.professionals.institution,
      notes: schema.professionals.notes,
      active: schema.professionals.active,
    })
    .from(schema.professionals)
    .innerJoin(schema.specialties, eq(schema.specialties.id, schema.professionals.specialtyId))
    .where(
      and(
        options.activeOnly ? eq(schema.professionals.active, true) : undefined,
        options.specialtyId ? eq(schema.professionals.specialtyId, options.specialtyId) : undefined,
      ),
    )
    .orderBy(
      desc(schema.professionals.active),
      asc(schema.specialties.position),
      asc(schema.professionals.name),
    );
}

export async function getProfessional(
  tx: Transaction,
  professionalId: string,
): Promise<ProfessionalRow | null> {
  const rows = await tx
    .select({
      id: schema.professionals.id,
      name: schema.professionals.name,
      kind: schema.professionals.kind,
      specialtyId: schema.professionals.specialtyId,
      specialtyName: schema.specialties.name,
      licenseNumber: schema.professionals.licenseNumber,
      phone: schema.professionals.phone,
      institution: schema.professionals.institution,
      notes: schema.professionals.notes,
      active: schema.professionals.active,
    })
    .from(schema.professionals)
    .innerJoin(schema.specialties, eq(schema.specialties.id, schema.professionals.specialtyId))
    .where(eq(schema.professionals.id, professionalId));
  return rows[0] ?? null;
}

export interface EncounterRow {
  id: string;
  residentId: string;
  residentFirstName: string;
  residentLastName: string;
  residentRoom: string | null;
  specialtyId: string;
  specialtyName: string;
  professionalId: string | null;
  professionalName: string | null;
  occurredAt: Date;
  location: string;
  reason: string;
  notes: string | null;
  instructions: string | null;
  nextControlOn: string | null;
  createdBy: string;
  authorName: string;
  createdAt: Date;
  voidedAt: Date | null;
  voidReason: string | null;
  voidedByName: string | null;
}

const voider = aliasedTable(schema.users, "voider");

function selectEncounters(tx: Transaction) {
  return tx
    .select({
      id: schema.careEncounters.id,
      residentId: schema.careEncounters.residentId,
      residentFirstName: schema.residents.firstName,
      residentLastName: schema.residents.lastName,
      residentRoom: schema.residents.roomLabel,
      specialtyId: schema.careEncounters.specialtyId,
      specialtyName: schema.specialties.name,
      professionalId: schema.careEncounters.professionalId,
      professionalName: schema.professionals.name,
      occurredAt: schema.careEncounters.occurredAt,
      location: schema.careEncounters.location,
      reason: schema.careEncounters.reason,
      notes: schema.careEncounters.notes,
      instructions: schema.careEncounters.instructions,
      nextControlOn: schema.careEncounters.nextControlOn,
      createdBy: schema.careEncounters.createdBy,
      authorName: schema.users.name,
      createdAt: schema.careEncounters.createdAt,
      voidedAt: schema.careEncounters.voidedAt,
      voidReason: schema.careEncounters.voidReason,
      voidedByName: voider.name,
    })
    .from(schema.careEncounters)
    .innerJoin(schema.residents, eq(schema.residents.id, schema.careEncounters.residentId))
    .innerJoin(schema.specialties, eq(schema.specialties.id, schema.careEncounters.specialtyId))
    .innerJoin(schema.users, eq(schema.users.id, schema.careEncounters.createdBy))
    .leftJoin(
      schema.professionals,
      eq(schema.professionals.id, schema.careEncounters.professionalId),
    )
    .leftJoin(voider, eq(voider.id, schema.careEncounters.voidedBy));
}

/** Atenciones de la sede, de la más nueva a la más vieja (incluye las anuladas, marcadas). */
export async function listEncounters(
  tx: Transaction,
  options: { siteId: string; specialtyId?: string; residentId?: string; limit?: number },
): Promise<EncounterRow[]> {
  return selectEncounters(tx)
    .where(
      and(
        eq(schema.careEncounters.siteId, options.siteId),
        options.specialtyId
          ? eq(schema.careEncounters.specialtyId, options.specialtyId)
          : undefined,
        options.residentId ? eq(schema.careEncounters.residentId, options.residentId) : undefined,
      ),
    )
    .orderBy(desc(schema.careEncounters.occurredAt), desc(schema.careEncounters.id))
    .limit(options.limit ?? 30);
}

export async function getEncounter(
  tx: Transaction,
  encounterId: string,
): Promise<EncounterRow | null> {
  const [row] = await selectEncounters(tx).where(eq(schema.careEncounters.id, encounterId));
  return row ?? null;
}

export interface LastVisitRow {
  residentId: string;
  firstName: string;
  lastName: string;
  roomLabel: string | null;
  lastAt: Date | null;
}

/**
 * "¿Cuándo lo vio el kinesiólogo por última vez?" (3.9): cada paciente activo
 * o internado fuera, con la fecha de su última atención de la especialidad.
 * Primero los que nunca tuvieron una; después, de la más vieja a la más nueva.
 */
export async function lastVisitsBySpecialty(
  tx: Transaction,
  options: { siteId: string; specialtyId: string },
): Promise<LastVisitRow[]> {
  const last = tx
    .select({
      residentId: schema.careEncounters.residentId,
      lastAt: max(schema.careEncounters.occurredAt).as("last_at"),
    })
    .from(schema.careEncounters)
    .where(
      and(
        eq(schema.careEncounters.specialtyId, options.specialtyId),
        isNull(schema.careEncounters.voidedAt),
      ),
    )
    .groupBy(schema.careEncounters.residentId)
    .as("last_visit");
  const rows = await tx
    .select({
      residentId: schema.residents.id,
      firstName: schema.residents.firstName,
      lastName: schema.residents.lastName,
      roomLabel: schema.residents.roomLabel,
      lastAt: last.lastAt,
    })
    .from(schema.residents)
    .leftJoin(last, eq(last.residentId, schema.residents.id))
    .where(
      and(
        eq(schema.residents.siteId, options.siteId),
        inArray(schema.residents.status, ["active", "hospitalized"]),
      ),
    )
    .orderBy(
      sql`${last.lastAt} asc nulls first`,
      asc(schema.residents.lastName),
      asc(schema.residents.firstName),
    );
  return rows.map((row) => ({ ...row, lastAt: row.lastAt ? new Date(row.lastAt) : null }));
}

export interface ControlRow {
  encounterId: string;
  residentId: string;
  residentFirstName: string;
  residentLastName: string;
  specialtyName: string;
  nextControlOn: string;
  reason: string;
}

/**
 * Próximos controles pedidos en una atención (6.11, paso 7), desde dos
 * semanas atrás hasta un mes adelante. Se descartan los que ya tuvieron una
 * atención posterior de la misma especialidad.
 */
export async function upcomingControls(
  tx: Transaction,
  options: { siteId: string; today: string; specialtyId?: string },
): Promise<ControlRow[]> {
  const from = shiftDate(options.today, -14);
  const to = shiftDate(options.today, 30);
  return tx
    .select({
      encounterId: schema.careEncounters.id,
      residentId: schema.careEncounters.residentId,
      residentFirstName: schema.residents.firstName,
      residentLastName: schema.residents.lastName,
      specialtyName: schema.specialties.name,
      nextControlOn: sql<string>`${schema.careEncounters.nextControlOn}::text`,
      reason: schema.careEncounters.reason,
    })
    .from(schema.careEncounters)
    .innerJoin(schema.residents, eq(schema.residents.id, schema.careEncounters.residentId))
    .innerJoin(schema.specialties, eq(schema.specialties.id, schema.careEncounters.specialtyId))
    .where(
      and(
        eq(schema.careEncounters.siteId, options.siteId),
        isNull(schema.careEncounters.voidedAt),
        inArray(schema.residents.status, ["active", "hospitalized"]),
        gte(schema.careEncounters.nextControlOn, from),
        lte(schema.careEncounters.nextControlOn, to),
        options.specialtyId
          ? eq(schema.careEncounters.specialtyId, options.specialtyId)
          : undefined,
        sql`not exists (
          select 1 from care_encounters later
          where later.resident_id = ${schema.careEncounters.residentId}
            and later.specialty_id = ${schema.careEncounters.specialtyId}
            and later.voided_at is null
            and later.occurred_at > ${schema.careEncounters.occurredAt}
        )`,
      ),
    )
    .orderBy(asc(schema.careEncounters.nextControlOn), asc(schema.residents.lastName))
    .limit(50);
}

function shiftDate(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day! + days)).toISOString().slice(0, 10);
}

export interface EmergencyRow {
  id: string;
  residentId: string;
  residentFirstName: string;
  residentLastName: string;
  residentRoom: string | null;
  startedAt: Date;
  description: string;
  calls: string | null;
  transferred: boolean;
  transferDestination: string | null;
  status: string;
  outcome: string | null;
  closedAt: Date | null;
  closedByName: string | null;
  createdBy: string;
  authorName: string;
  createdAt: Date;
}

const closer = aliasedTable(schema.users, "closer");

function selectEmergencies(tx: Transaction) {
  return tx
    .select({
      id: schema.emergencies.id,
      residentId: schema.emergencies.residentId,
      residentFirstName: schema.residents.firstName,
      residentLastName: schema.residents.lastName,
      residentRoom: schema.residents.roomLabel,
      startedAt: schema.emergencies.startedAt,
      description: schema.emergencies.description,
      calls: schema.emergencies.calls,
      transferred: schema.emergencies.transferred,
      transferDestination: schema.emergencies.transferDestination,
      status: schema.emergencies.status,
      outcome: schema.emergencies.outcome,
      closedAt: schema.emergencies.closedAt,
      closedByName: closer.name,
      createdBy: schema.emergencies.createdBy,
      authorName: schema.users.name,
      createdAt: schema.emergencies.createdAt,
    })
    .from(schema.emergencies)
    .innerJoin(schema.residents, eq(schema.residents.id, schema.emergencies.residentId))
    .innerJoin(schema.users, eq(schema.users.id, schema.emergencies.createdBy))
    .leftJoin(closer, eq(closer.id, schema.emergencies.closedBy));
}

/** Emergencias de la sede: primero las abiertas, después de la más nueva a la más vieja. */
export async function listEmergencies(
  tx: Transaction,
  options: { siteId: string; residentId?: string; limit?: number },
): Promise<EmergencyRow[]> {
  return selectEmergencies(tx)
    .where(
      and(
        eq(schema.emergencies.siteId, options.siteId),
        options.residentId ? eq(schema.emergencies.residentId, options.residentId) : undefined,
      ),
    )
    .orderBy(
      sql`${schema.emergencies.status} = 'open' desc`,
      desc(schema.emergencies.startedAt),
      desc(schema.emergencies.id),
    )
    .limit(options.limit ?? 50);
}

export async function getEmergency(
  tx: Transaction,
  emergencyId: string,
): Promise<EmergencyRow | null> {
  const [row] = await selectEmergencies(tx).where(eq(schema.emergencies.id, emergencyId));
  return row ?? null;
}

export async function countOpenEmergencies(tx: Transaction, siteId: string): Promise<number> {
  const [row] = await tx
    .select({ total: count() })
    .from(schema.emergencies)
    .where(and(eq(schema.emergencies.siteId, siteId), eq(schema.emergencies.status, "open")));
  return row?.total ?? 0;
}
