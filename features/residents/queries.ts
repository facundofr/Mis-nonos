import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";

import * as schema from "@/db/schema";
import type { ResidentStatus } from "@/db/schema";
import type { Transaction } from "@/lib/db/client";

/*
 * Lecturas de pacientes (dentro de withTenant: solo la residencia activa).
 * Los ingresos en borrador o cancelados no aparecen en listas ni búsqueda
 * (F.4): se ven solo desde "Ingresos en curso".
 */

export type ResidentRow = typeof schema.residents.$inferSelect;
export type ContactRow = typeof schema.residentContacts.$inferSelect;
export type AllergyRow = typeof schema.residentAllergies.$inferSelect;

export type ResidentView = "activos" | "internados" | "egresados";

const VIEW_STATUSES: Record<ResidentView, ResidentStatus[]> = {
  activos: ["active", "hospitalized"],
  internados: ["hospitalized"],
  egresados: ["discharged"],
};

export interface ResidentListItem {
  id: string;
  firstName: string;
  lastName: string;
  roomLabel: string | null;
  birthDate: string | null;
  status: ResidentStatus;
  admissionModality: string;
  hasAllergies: boolean;
}

/** Escapa los comodines de LIKE en lo que escribe la persona. */
function likePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

export async function listResidents(
  tx: Transaction,
  options: { view?: ResidentView; query?: string; limit?: number } = {},
): Promise<ResidentListItem[]> {
  const filters: SQL[] = [
    inArray(schema.residents.status, VIEW_STATUSES[options.view ?? "activos"]),
  ];
  const query = options.query?.trim();
  if (query) {
    // Índice de trigramas sobre search_text (sin acentos ni mayúsculas).
    filters.push(
      sql`${schema.residents.searchText} like app.normalize_search(${likePattern(query)})`,
    );
  }
  const rows = await tx
    .select({
      id: schema.residents.id,
      firstName: schema.residents.firstName,
      lastName: schema.residents.lastName,
      roomLabel: schema.residents.roomLabel,
      birthDate: schema.residents.birthDate,
      status: schema.residents.status,
      admissionModality: schema.residents.admissionModality,
      // Nombres explícitos: dentro de la subconsulta, Drizzle escribe la
      // columna sin la tabla y "id" se resolvería contra las alergias.
      hasAllergies: sql<boolean>`exists (
        select 1 from resident_allergies a
        where a.resident_id = residents.id and a.status = 'active'
      )`,
    })
    .from(schema.residents)
    .where(and(...filters))
    .orderBy(asc(schema.residents.lastName), asc(schema.residents.firstName))
    .limit(options.limit ?? 500);
  return rows.map((row) => ({ ...row, status: row.status as ResidentStatus }));
}

/** Cantidad de pacientes por estado (para los filtros y el Inicio). */
export async function countResidents(tx: Transaction): Promise<Record<ResidentStatus, number>> {
  const rows = await tx
    .select({ status: schema.residents.status, count: sql<number>`count(*)::int` })
    .from(schema.residents)
    .groupBy(schema.residents.status);
  const counts = {
    admission_draft: 0,
    admission_cancelled: 0,
    active: 0,
    hospitalized: 0,
    discharged: 0,
  } satisfies Record<ResidentStatus, number>;
  for (const row of rows) counts[row.status as ResidentStatus] = row.count;
  return counts;
}

export async function getResident(
  tx: Transaction,
  residentId: string,
): Promise<ResidentRow | null> {
  const [row] = await tx.select().from(schema.residents).where(eq(schema.residents.id, residentId));
  return row ?? null;
}

export function listAllergies(tx: Transaction, residentId: string): Promise<AllergyRow[]> {
  return tx
    .select()
    .from(schema.residentAllergies)
    .where(
      and(
        eq(schema.residentAllergies.residentId, residentId),
        eq(schema.residentAllergies.status, "active"),
      ),
    )
    .orderBy(asc(schema.residentAllergies.createdAt));
}

/**
 * Contactos activos en el orden para llamar (7.3-E): por prioridad de
 * emergencia (el responsable de la internación suele ser el 1.º) y al final
 * los que no se llaman en una emergencia.
 */
export function listContacts(tx: Transaction, residentId: string): Promise<ContactRow[]> {
  return tx
    .select()
    .from(schema.residentContacts)
    .where(
      and(
        eq(schema.residentContacts.residentId, residentId),
        eq(schema.residentContacts.active, true),
      ),
    )
    .orderBy(
      sql`${schema.residentContacts.emergencyPriority} asc nulls last`,
      desc(schema.residentContacts.isAdmissionResponsible),
      asc(schema.residentContacts.name),
    );
}

export async function getContact(
  tx: Transaction,
  residentId: string,
  contactId: string,
): Promise<ContactRow | null> {
  const [row] = await tx
    .select()
    .from(schema.residentContacts)
    .where(
      and(
        eq(schema.residentContacts.id, contactId),
        eq(schema.residentContacts.residentId, residentId),
      ),
    );
  return row ?? null;
}

export interface AdmissionInProgress {
  admissionId: string;
  residentId: string;
  firstName: string;
  lastName: string;
  currentStep: number;
  createdAt: Date;
  createdByName: string | null;
}

/** "Ingresos en curso" (F.4): borradores del ingreso guiado. */
export async function listAdmissionsInProgress(tx: Transaction): Promise<AdmissionInProgress[]> {
  return tx
    .select({
      admissionId: schema.admissions.id,
      residentId: schema.residents.id,
      firstName: schema.residents.firstName,
      lastName: schema.residents.lastName,
      currentStep: schema.admissions.currentStep,
      createdAt: schema.admissions.createdAt,
      createdByName: schema.users.name,
    })
    .from(schema.admissions)
    .innerJoin(schema.residents, eq(schema.residents.id, schema.admissions.residentId))
    .leftJoin(schema.users, eq(schema.users.id, schema.admissions.createdBy))
    .where(eq(schema.admissions.status, "draft"))
    .orderBy(desc(schema.admissions.createdAt));
}

export async function getAdmission(tx: Transaction, admissionId: string) {
  const [row] = await tx
    .select()
    .from(schema.admissions)
    .where(eq(schema.admissions.id, admissionId));
  return row ?? null;
}

export async function getAdmissionByResident(tx: Transaction, residentId: string) {
  const [row] = await tx
    .select()
    .from(schema.admissions)
    .where(eq(schema.admissions.residentId, residentId));
  return row ?? null;
}

/** Nombres de quienes figuran en registros (autores), para mostrarlos. */
export async function userNames(
  tx: Transaction,
  ids: (string | null)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();
  const rows = await tx
    .select({ id: schema.users.id, name: schema.users.name })
    .from(schema.users)
    .where(inArray(schema.users.id, unique));
  return new Map(rows.map((row) => [row.id, row.name]));
}
