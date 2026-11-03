import { and, eq, isNull, max } from "drizzle-orm";

import * as schema from "@/db/schema";
import { diffChanges, recordAudit } from "@/lib/audit";
import type { Transaction } from "@/lib/db/client";
import type { TenantContext } from "@/lib/db/tenant";
import { DomainError } from "@/lib/errors";
import { fromLocal } from "@/lib/time/zoned";

import type {
  CloseEmergencyInput,
  EmergencyInput,
  EncounterInput,
  ProfessionalInput,
  SpecialtyInput,
  VoidEncounterInput,
} from "./schemas";

/*
 * Reglas del seguimiento del cuidado (docs/decisions/0017):
 * - especialidades y profesionales no se borran: se desactivan;
 *   Enfermería no se puede desactivar (la usa su sección);
 * - una atención o una emergencia se registra sobre un paciente activo o
 *   internado fuera, y no puede ser futura;
 * - una atención no se corrige: se anula con motivo y se registra de nuevo;
 * - una emergencia se cierra con el resultado.
 * Los permisos los verifica la Server Action (y la base, en sus políticas).
 * La auditoría no copia textos clínicos (quedan en su tabla): registra qué
 * se hizo, quién y sobre qué paciente.
 */

/** Margen para el reloj del teléfono: hasta 5 minutos "en el futuro". */
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

async function siteTimezone(tx: Transaction, siteId: string): Promise<string> {
  const [site] = await tx
    .select({ timezone: schema.sites.timezone })
    .from(schema.sites)
    .where(eq(schema.sites.id, siteId));
  if (!site) throw new DomainError("La sede no existe.");
  return site.timezone;
}

async function activeResident(tx: Transaction, residentId: string) {
  const [resident] = await tx
    .select({ status: schema.residents.status, siteId: schema.residents.siteId })
    .from(schema.residents)
    .where(eq(schema.residents.id, residentId));
  if (!resident || !["active", "hospitalized"].includes(resident.status)) {
    throw new DomainError("Ese paciente no está activo: no se le pueden registrar atenciones.");
  }
  return resident;
}

/** Fecha y hora locales de la sede ("2026-11-03", "14:30") a un instante. */
export function localInstant(date: string, time: string, timeZone: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return fromLocal(
    { year: year!, month: month!, day: day!, hour: hour!, minute: minute! },
    timeZone,
  );
}

function assertNotFuture(instant: Date, now: Date, field: string) {
  if (instant.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) {
    throw new DomainError("La fecha y hora no pueden ser futuras.", field);
  }
}

// Especialidades ------------------------------------------------------------

async function assertUniqueSpecialty(tx: Transaction, name: string, exceptId: string | null) {
  const [duplicate] = await tx
    .select({ id: schema.specialties.id })
    .from(schema.specialties)
    .where(eq(schema.specialties.name, name));
  if (duplicate && duplicate.id !== exceptId) {
    throw new DomainError("Ya hay una especialidad con ese nombre.", "name");
  }
}

export async function createSpecialty(
  tx: Transaction,
  actor: TenantContext,
  input: Pick<SpecialtyInput, "name">,
): Promise<string> {
  await assertUniqueSpecialty(tx, input.name, null);
  const [last] = await tx
    .select({ position: max(schema.specialties.position) })
    .from(schema.specialties);
  const [row] = await tx
    .insert(schema.specialties)
    .values({
      organizationId: actor.organizationId,
      name: input.name,
      position: (last?.position ?? 0) + 1,
    })
    .returning({ id: schema.specialties.id });
  await recordAudit(tx, actor, {
    action: "care.specialty_created",
    entityType: "specialty",
    entityId: row!.id,
    changes: diffChanges(null, { name: input.name }),
  });
  return row!.id;
}

export async function updateSpecialty(
  tx: Transaction,
  actor: TenantContext,
  specialtyId: string,
  input: SpecialtyInput,
): Promise<void> {
  const [current] = await tx
    .select()
    .from(schema.specialties)
    .where(eq(schema.specialties.id, specialtyId));
  if (!current) throw new DomainError("Esa especialidad no existe.");
  if (current.key && !input.active) {
    throw new DomainError(
      `${current.name} no se puede desactivar: la usa la sección del menú.`,
      "active",
    );
  }
  await assertUniqueSpecialty(tx, input.name, specialtyId);
  const changes = diffChanges(
    { name: current.name, active: current.active },
    { name: input.name, active: input.active },
  );
  if (!changes) throw new DomainError("No hay cambios para guardar.");
  await tx
    .update(schema.specialties)
    .set({ name: input.name, active: input.active })
    .where(eq(schema.specialties.id, specialtyId));
  await recordAudit(tx, actor, {
    action: "care.specialty_updated",
    entityType: "specialty",
    entityId: specialtyId,
    changes,
  });
}

// Profesionales -------------------------------------------------------------

async function assertActiveSpecialty(tx: Transaction, specialtyId: string, allowInactive?: string) {
  const [specialty] = await tx
    .select({ id: schema.specialties.id, active: schema.specialties.active })
    .from(schema.specialties)
    .where(eq(schema.specialties.id, specialtyId));
  if (!specialty || (!specialty.active && specialty.id !== allowInactive)) {
    throw new DomainError("Elegí la especialidad.", "specialtyId");
  }
}

const professionalFields = (input: ProfessionalInput) => ({
  name: input.name,
  specialtyId: input.specialtyId,
  kind: input.kind,
  licenseNumber: input.licenseNumber,
  phone: input.phone,
  institution: input.institution,
  notes: input.notes,
});

export async function createProfessional(
  tx: Transaction,
  actor: TenantContext,
  input: ProfessionalInput,
): Promise<string> {
  await assertActiveSpecialty(tx, input.specialtyId);
  const [row] = await tx
    .insert(schema.professionals)
    .values({
      organizationId: actor.organizationId,
      ...professionalFields(input),
      createdBy: actor.userId,
    })
    .returning({ id: schema.professionals.id });
  await recordAudit(tx, actor, {
    action: "care.professional_created",
    entityType: "professional",
    entityId: row!.id,
    changes: diffChanges(null, { name: input.name, kind: input.kind }),
  });
  return row!.id;
}

export async function updateProfessional(
  tx: Transaction,
  actor: TenantContext,
  professionalId: string,
  input: ProfessionalInput,
): Promise<void> {
  const [current] = await tx
    .select()
    .from(schema.professionals)
    .where(eq(schema.professionals.id, professionalId));
  if (!current) throw new DomainError("Ese profesional no existe.");
  // Puede seguir en una especialidad que se desactivó, pero no pasar a una.
  await assertActiveSpecialty(tx, input.specialtyId, current.specialtyId);
  const next = { ...professionalFields(input), active: input.active };
  const changes = diffChanges(
    {
      name: current.name,
      specialtyId: current.specialtyId,
      kind: current.kind,
      licenseNumber: current.licenseNumber,
      phone: current.phone,
      institution: current.institution,
      notes: current.notes,
      active: current.active,
    },
    next,
  );
  if (!changes) throw new DomainError("No hay cambios para guardar.");
  await tx
    .update(schema.professionals)
    .set(next)
    .where(eq(schema.professionals.id, professionalId));
  await recordAudit(tx, actor, {
    action: "care.professional_updated",
    entityType: "professional",
    entityId: professionalId,
    changes,
  });
}

// Atenciones ----------------------------------------------------------------

export async function recordEncounter(
  tx: Transaction,
  actor: TenantContext,
  input: EncounterInput & { residentId: string },
  now = new Date(),
): Promise<string> {
  const resident = await activeResident(tx, input.residentId);
  await assertActiveSpecialty(tx, input.specialtyId);
  if (input.professionalId) {
    const [professional] = await tx
      .select({ active: schema.professionals.active })
      .from(schema.professionals)
      .where(eq(schema.professionals.id, input.professionalId));
    if (!professional?.active) throw new DomainError("Elegí el profesional.", "professionalId");
  }
  const timeZone = await siteTimezone(tx, resident.siteId);
  const occurredAt = localInstant(input.occurredDate, input.occurredTime, timeZone);
  assertNotFuture(occurredAt, now, "occurredTime");
  if (input.nextControlOn && input.nextControlOn < input.occurredDate) {
    throw new DomainError(
      "El próximo control tiene que ser después de la atención.",
      "nextControlOn",
    );
  }

  const [row] = await tx
    .insert(schema.careEncounters)
    .values({
      organizationId: actor.organizationId,
      siteId: resident.siteId,
      residentId: input.residentId,
      specialtyId: input.specialtyId,
      professionalId: input.professionalId,
      occurredAt,
      location: input.location,
      reason: input.reason,
      notes: input.notes,
      instructions: input.instructions,
      nextControlOn: input.nextControlOn,
      createdBy: actor.userId,
    })
    .returning({ id: schema.careEncounters.id });
  await recordAudit(tx, actor, {
    action: "care.encounter_recorded",
    entityType: "care_encounter",
    entityId: row!.id,
    siteId: resident.siteId,
    metadata: { residentId: input.residentId, specialtyId: input.specialtyId },
  });
  return row!.id;
}

export async function voidEncounter(
  tx: Transaction,
  actor: TenantContext,
  encounterId: string,
  input: VoidEncounterInput,
): Promise<void> {
  const updated = await tx
    .update(schema.careEncounters)
    .set({ voidedAt: new Date(), voidedBy: actor.userId, voidReason: input.voidReason })
    .where(and(eq(schema.careEncounters.id, encounterId), isNull(schema.careEncounters.voidedAt)))
    .returning({
      siteId: schema.careEncounters.siteId,
      residentId: schema.careEncounters.residentId,
    });
  const row = updated[0];
  if (!row) throw new DomainError("Esa atención no existe o ya está anulada.");
  await recordAudit(tx, actor, {
    action: "care.encounter_voided",
    entityType: "care_encounter",
    entityId: encounterId,
    siteId: row.siteId,
    metadata: { residentId: row.residentId },
  });
}

// Emergencias ---------------------------------------------------------------

function transferFields(input: { transferred: boolean; transferDestination: string | null }) {
  return {
    transferred: input.transferred,
    transferDestination: input.transferred ? input.transferDestination : null,
  };
}

export async function recordEmergency(
  tx: Transaction,
  actor: TenantContext,
  input: EmergencyInput & { residentId: string },
  now = new Date(),
): Promise<string> {
  const [resident] = await tx
    .select({ status: schema.residents.status, siteId: schema.residents.siteId })
    .from(schema.residents)
    .where(eq(schema.residents.id, input.residentId));
  if (!resident || !["active", "hospitalized"].includes(resident.status)) {
    throw new DomainError("Ese paciente no está activo: no se le puede registrar una emergencia.");
  }
  const timeZone = await siteTimezone(tx, resident.siteId);
  const startedAt = localInstant(input.startedDate, input.startedTime, timeZone);
  assertNotFuture(startedAt, now, "startedTime");

  const [row] = await tx
    .insert(schema.emergencies)
    .values({
      organizationId: actor.organizationId,
      siteId: resident.siteId,
      residentId: input.residentId,
      startedAt,
      description: input.description,
      calls: input.calls,
      ...transferFields(input),
      createdBy: actor.userId,
    })
    .returning({ id: schema.emergencies.id });
  await recordAudit(tx, actor, {
    action: "emergency.recorded",
    entityType: "emergency",
    entityId: row!.id,
    siteId: resident.siteId,
    changes: diffChanges(null, { transferred: input.transferred }),
    metadata: { residentId: input.residentId },
  });
  return row!.id;
}

export async function closeEmergency(
  tx: Transaction,
  actor: TenantContext,
  emergencyId: string,
  input: CloseEmergencyInput,
): Promise<void> {
  const updated = await tx
    .update(schema.emergencies)
    .set({
      calls: input.calls,
      ...transferFields(input),
      outcome: input.outcome,
      status: "closed",
      closedAt: new Date(),
      closedBy: actor.userId,
    })
    .where(and(eq(schema.emergencies.id, emergencyId), eq(schema.emergencies.status, "open")))
    .returning({ siteId: schema.emergencies.siteId, residentId: schema.emergencies.residentId });
  const row = updated[0];
  if (!row) throw new DomainError("Esa emergencia no existe o ya está cerrada.");
  await recordAudit(tx, actor, {
    action: "emergency.closed",
    entityType: "emergency",
    entityId: emergencyId,
    siteId: row.siteId,
    changes: diffChanges(null, { transferred: input.transferred }),
    metadata: { residentId: row.residentId },
  });
}
