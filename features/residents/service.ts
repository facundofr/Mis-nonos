import { and, eq, inArray, ne, sql } from "drizzle-orm";

import * as schema from "@/db/schema";
import type { ResidentStatus } from "@/db/schema";
import { diffChanges, recordAudit, type ChangeSet } from "@/lib/audit";
import type { Transaction } from "@/lib/db/client";
import type { TenantContext } from "@/lib/db/tenant";
import { CONCURRENT_CHANGE_MESSAGE, DomainError } from "@/lib/errors";
import { emitDomainEvent } from "@/lib/events";

import { getResident, type ResidentRow } from "./queries";
import type { AllergyInput, ContactInput, ResidentDataInput } from "./schemas";

/*
 * Reglas de pacientes (7.3-C, 7.3-D, F.4). Los permisos los verifica la
 * Server Action; acá van las reglas de negocio y la auditoría. Todo lo que
 * cambia sobre un paciente se registra con entity_type "resident" y su id,
 * así su historial (Actividad) lo muestra completo.
 */

const STATUS_CHANGE_FIELDS = [
  "status",
  "hospitalizationPlace",
  "hospitalizedSince",
  "dischargeDate",
  "dischargeReason",
  "dischargeNotes",
];

async function requireResident(
  tx: Transaction,
  residentId: string,
  allowed?: readonly ResidentStatus[],
): Promise<ResidentRow> {
  const resident = await getResident(tx, residentId);
  if (!resident) throw new DomainError("Ese paciente no existe.");
  if (allowed && !allowed.includes(resident.status as ResidentStatus)) {
    throw new DomainError("Ese paciente no está en un estado que permita este cambio.");
  }
  return resident;
}

async function auditResident(
  tx: Transaction,
  actor: TenantContext,
  resident: Pick<ResidentRow, "id" | "siteId">,
  action: string,
  changes: ChangeSet | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await recordAudit(tx, actor, {
    action,
    entityType: "resident",
    entityId: resident.id,
    siteId: resident.siteId,
    changes,
    metadata: metadata ?? null,
  });
}

/** Paso 1 del ingreso guiado: crea el paciente en borrador y el ingreso (F.4). */
export async function startAdmission(
  tx: Transaction,
  actor: TenantContext,
  siteId: string,
  input: ResidentDataInput,
): Promise<{ residentId: string; admissionId: string }> {
  const [resident] = await tx
    .insert(schema.residents)
    .values({
      organizationId: actor.organizationId,
      siteId,
      ...input,
      status: "admission_draft",
      createdBy: actor.userId,
      updatedBy: actor.userId,
    })
    .returning({ id: schema.residents.id });
  if (!resident) throw new Error("No se pudo crear el paciente.");

  const [admission] = await tx
    .insert(schema.admissions)
    .values({
      organizationId: actor.organizationId,
      siteId,
      residentId: resident.id,
      currentStep: 1,
      createdBy: actor.userId,
    })
    .returning({ id: schema.admissions.id });
  if (!admission) throw new Error("No se pudo crear el ingreso.");

  await auditResident(
    tx,
    actor,
    { id: resident.id, siteId },
    "admission.started",
    diffChanges(null, input),
  );
  return { residentId: resident.id, admissionId: admission.id };
}

/**
 * "Editar paciente" (DC-13) y el paso 1 cuando se retoma un borrador. Usa el
 * número de versión para no pisar un cambio de otra persona.
 */
export async function updateResidentData(
  tx: Transaction,
  actor: TenantContext,
  residentId: string,
  expectedVersion: number,
  input: ResidentDataInput,
): Promise<void> {
  const before = await requireResident(tx, residentId, [
    "admission_draft",
    "active",
    "hospitalized",
  ]);
  const updated = await tx
    .update(schema.residents)
    .set({ ...input, version: sql`${schema.residents.version} + 1`, updatedBy: actor.userId })
    .where(and(eq(schema.residents.id, residentId), eq(schema.residents.version, expectedVersion)))
    .returning({ id: schema.residents.id });
  if (updated.length === 0) throw new DomainError(CONCURRENT_CHANGE_MESSAGE);
  const changes = diffChanges(before, { ...before, ...input }, Object.keys(input));
  if (changes) await auditResident(tx, actor, before, "resident.updated", changes);
}

const CONTACT_FIELDS = [
  "name",
  "relationship",
  "nationalId",
  "address",
  "phonePrimary",
  "phoneMobile",
  "phoneWork",
  "whatsapp",
  "email",
  "emergencyPriority",
  "isAdmissionResponsible",
  "isLegalRepresentative",
  "canReceiveInfo",
  "canPickUp",
  "isPayer",
  "availabilityNotes",
  "lastVerifiedAt",
];

function contactValues(input: ContactInput, today: string) {
  const { verified, ...values } = input;
  return verified ? { ...values, lastVerifiedAt: today } : values;
}

/** Si este contacto pasa a ser el responsable, el anterior deja de serlo. */
async function releaseResponsible(
  tx: Transaction,
  residentId: string,
  exceptContactId: string | null,
) {
  await tx
    .update(schema.residentContacts)
    .set({ isAdmissionResponsible: false })
    .where(
      and(
        eq(schema.residentContacts.residentId, residentId),
        eq(schema.residentContacts.isAdmissionResponsible, true),
        exceptContactId ? ne(schema.residentContacts.id, exceptContactId) : undefined,
      ),
    );
}

export async function saveContact(
  tx: Transaction,
  actor: TenantContext,
  residentId: string,
  contactId: string | null,
  input: ContactInput,
  today: string,
): Promise<string> {
  const resident = await requireResident(tx, residentId, [
    "admission_draft",
    "active",
    "hospitalized",
  ]);
  const values = contactValues(input, today);
  if (input.isAdmissionResponsible) await releaseResponsible(tx, residentId, contactId);

  if (contactId) {
    const [before] = await tx
      .select()
      .from(schema.residentContacts)
      .where(
        and(
          eq(schema.residentContacts.id, contactId),
          eq(schema.residentContacts.residentId, residentId),
          eq(schema.residentContacts.active, true),
        ),
      );
    if (!before) throw new DomainError("Ese contacto no existe.");
    await tx
      .update(schema.residentContacts)
      .set({ ...values, updatedBy: actor.userId })
      .where(eq(schema.residentContacts.id, contactId));
    const changes = diffChanges(before, { ...before, ...values }, CONTACT_FIELDS);
    if (changes) {
      await auditResident(tx, actor, resident, "resident.contact_updated", changes, { contactId });
    }
    return contactId;
  }

  const [created] = await tx
    .insert(schema.residentContacts)
    .values({
      organizationId: actor.organizationId,
      residentId,
      ...values,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    })
    .returning({ id: schema.residentContacts.id });
  if (!created) throw new Error("No se pudo guardar el contacto.");
  await auditResident(
    tx,
    actor,
    resident,
    "resident.contact_added",
    diffChanges(null, values, CONTACT_FIELDS),
    { contactId: created.id },
  );
  return created.id;
}

/** Quitar un contacto: se desactiva y queda en el historial (E6). */
export async function removeContact(
  tx: Transaction,
  actor: TenantContext,
  residentId: string,
  contactId: string,
): Promise<void> {
  const resident = await requireResident(tx, residentId);
  const removed = await tx
    .update(schema.residentContacts)
    .set({ active: false, isAdmissionResponsible: false, updatedBy: actor.userId })
    .where(
      and(
        eq(schema.residentContacts.id, contactId),
        eq(schema.residentContacts.residentId, residentId),
        eq(schema.residentContacts.active, true),
      ),
    )
    .returning({ name: schema.residentContacts.name });
  if (removed.length === 0) throw new DomainError("Ese contacto no existe.");
  await auditResident(tx, actor, resident, "resident.contact_removed", null, {
    contactId,
  });
}

export async function addAllergy(
  tx: Transaction,
  actor: TenantContext,
  residentId: string,
  input: AllergyInput,
): Promise<void> {
  const resident = await requireResident(tx, residentId, [
    "admission_draft",
    "active",
    "hospitalized",
  ]);
  const [created] = await tx
    .insert(schema.residentAllergies)
    .values({
      organizationId: actor.organizationId,
      residentId,
      ...input,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    })
    .returning({ id: schema.residentAllergies.id });
  await auditResident(tx, actor, resident, "resident.allergy_added", diffChanges(null, input), {
    allergyId: created?.id,
  });
}

/** Una alergia cargada por error se descarta: no se borra (11.2). */
export async function discardAllergy(
  tx: Transaction,
  actor: TenantContext,
  residentId: string,
  allergyId: string,
): Promise<void> {
  const resident = await requireResident(tx, residentId);
  const discarded = await tx
    .update(schema.residentAllergies)
    .set({ status: "discarded", updatedBy: actor.userId })
    .where(
      and(
        eq(schema.residentAllergies.id, allergyId),
        eq(schema.residentAllergies.residentId, residentId),
        eq(schema.residentAllergies.status, "active"),
      ),
    )
    .returning({ substance: schema.residentAllergies.substance });
  if (discarded.length === 0) throw new DomainError("Esa alergia no existe.");
  await auditResident(
    tx,
    actor,
    resident,
    "resident.allergy_discarded",
    diffChanges({ status: "active" }, { status: "discarded" }),
    { allergyId, sustancia: discarded[0]!.substance },
  );
}

async function changeStatus(
  tx: Transaction,
  actor: TenantContext,
  resident: ResidentRow,
  values: Partial<ResidentRow> & { status: ResidentStatus },
): Promise<void> {
  await tx
    .update(schema.residents)
    .set({
      ...values,
      statusChangedAt: new Date(),
      version: sql`${schema.residents.version} + 1`,
      updatedBy: actor.userId,
    })
    .where(eq(schema.residents.id, resident.id));
  await auditResident(
    tx,
    actor,
    resident,
    "resident.status_changed",
    diffChanges(resident, { ...resident, ...values }, STATUS_CHANGE_FIELDS),
  );
  await emitDomainEvent(tx, actor, {
    type: "resident.status_changed",
    entityType: "resident",
    entityId: resident.id,
    siteId: resident.siteId,
    payload: { status: values.status },
  });
}

/** "Internado fuera" (F.4): lugar y fecha. Sigue siendo paciente de la residencia. */
export async function hospitalize(
  tx: Transaction,
  actor: TenantContext,
  residentId: string,
  input: { place: string; since: string },
): Promise<void> {
  const resident = await requireResident(tx, residentId, ["active"]);
  await changeStatus(tx, actor, resident, {
    status: "hospitalized",
    hospitalizationPlace: input.place,
    hospitalizedSince: input.since,
  });
}

/** Vuelve de la internación: activo de nuevo (la fecha queda en la auditoría). */
export async function returnFromHospital(
  tx: Transaction,
  actor: TenantContext,
  residentId: string,
  input: { date: string },
): Promise<void> {
  const resident = await requireResident(tx, residentId, ["hospitalized"]);
  await changeStatus(tx, actor, resident, {
    status: "active",
    hospitalizationPlace: null,
    hospitalizedSince: null,
  });
  await auditResident(tx, actor, resident, "resident.returned", null, { fecha: input.date });
}

/**
 * Egreso sin borrado (F1-RES-05): deja de aparecer entre los activos, en
 * emergencia y en el traspaso; se conservan sus datos y contactos.
 */
export async function dischargeResident(
  tx: Transaction,
  actor: TenantContext,
  residentId: string,
  input: { reason: string; date: string; notes: string | null },
): Promise<void> {
  const resident = await requireResident(tx, residentId, ["active", "hospitalized"]);
  await changeStatus(tx, actor, resident, {
    status: "discharged",
    hospitalizationPlace: null,
    hospitalizedSince: null,
    dischargeReason: input.reason,
    dischargeDate: input.date,
    dischargeNotes: input.notes,
  });
}

/** Avanza el último paso completado del ingreso (nunca retrocede). */
export async function completeAdmissionStep(
  tx: Transaction,
  admissionId: string,
  step: number,
): Promise<void> {
  await tx
    .update(schema.admissions)
    .set({ currentStep: sql`greatest(${schema.admissions.currentStep}, ${step})` })
    .where(and(eq(schema.admissions.id, admissionId), eq(schema.admissions.status, "draft")));
}

async function requireDraftAdmission(tx: Transaction, admissionId: string) {
  const [admission] = await tx
    .select()
    .from(schema.admissions)
    .where(eq(schema.admissions.id, admissionId));
  if (!admission || admission.status !== "draft") {
    throw new DomainError("Ese ingreso ya no está en curso.");
  }
  return admission;
}

/**
 * Paso 4: confirmar el ingreso. Hace falta el responsable de la internación;
 * los documentos faltantes no frenan el ingreso: quedan pendientes (6.12).
 */
export async function confirmAdmission(
  tx: Transaction,
  actor: TenantContext,
  admissionId: string,
): Promise<string> {
  const admission = await requireDraftAdmission(tx, admissionId);
  const resident = await requireResident(tx, admission.residentId, ["admission_draft"]);

  const [responsible] = await tx
    .select({ id: schema.residentContacts.id })
    .from(schema.residentContacts)
    .where(
      and(
        eq(schema.residentContacts.residentId, resident.id),
        eq(schema.residentContacts.isAdmissionResponsible, true),
        eq(schema.residentContacts.active, true),
      ),
    );
  if (!responsible) {
    throw new DomainError("Falta el responsable de la internación (paso 2).");
  }

  const now = new Date();
  await tx
    .update(schema.admissions)
    .set({ status: "confirmed", currentStep: 4, confirmedBy: actor.userId, confirmedAt: now })
    .where(eq(schema.admissions.id, admissionId));
  await tx
    .update(schema.residents)
    .set({
      status: "active",
      statusChangedAt: now,
      version: sql`${schema.residents.version} + 1`,
      updatedBy: actor.userId,
    })
    .where(eq(schema.residents.id, resident.id));
  await auditResident(
    tx,
    actor,
    resident,
    "admission.confirmed",
    diffChanges({ status: "admission_draft" }, { status: "active" }),
  );
  await emitDomainEvent(tx, actor, {
    type: "resident.admitted",
    entityType: "resident",
    entityId: resident.id,
    siteId: resident.siteId,
  });
  return resident.id;
}

/** Cancelar un ingreso en borrador: no se borra, queda cancelado (F.4). */
export async function cancelAdmission(
  tx: Transaction,
  actor: TenantContext,
  admissionId: string,
): Promise<void> {
  const admission = await requireDraftAdmission(tx, admissionId);
  const resident = await requireResident(tx, admission.residentId, ["admission_draft"]);
  const now = new Date();
  await tx
    .update(schema.admissions)
    .set({ status: "cancelled", cancelledBy: actor.userId, cancelledAt: now })
    .where(eq(schema.admissions.id, admissionId));
  await tx
    .update(schema.residents)
    .set({ status: "admission_cancelled", statusChangedAt: now, updatedBy: actor.userId })
    .where(eq(schema.residents.id, resident.id));
  await auditResident(
    tx,
    actor,
    resident,
    "admission.cancelled",
    diffChanges({ status: "admission_draft" }, { status: "admission_cancelled" }),
  );
}

/** Un DNI no puede repetirse entre pacientes activos o ingresos en curso. */
export async function assertUniqueNationalId(
  tx: Transaction,
  nationalId: string | null,
  exceptResidentId?: string,
): Promise<void> {
  if (!nationalId) return;
  const [duplicate] = await findByNationalId(tx, nationalId, exceptResidentId);
  if (!duplicate) return;
  const where = duplicate.status === "admission_draft" ? " (está en Ingresos en curso)" : "";
  throw new DomainError(
    `Ya hay un paciente con ese DNI: ${duplicate.firstName} ${duplicate.lastName}${where}.`,
    "nationalId",
  );
}

/** Pacientes con el mismo DNI (activos o en borrador), para avisar antes de duplicar. */
export async function findByNationalId(
  tx: Transaction,
  nationalId: string,
  exceptResidentId?: string,
): Promise<Pick<ResidentRow, "id" | "firstName" | "lastName" | "status">[]> {
  return tx
    .select({
      id: schema.residents.id,
      firstName: schema.residents.firstName,
      lastName: schema.residents.lastName,
      status: schema.residents.status,
    })
    .from(schema.residents)
    .where(
      and(
        eq(schema.residents.nationalId, nationalId),
        inArray(schema.residents.status, ["admission_draft", "active", "hospitalized"]),
        exceptResidentId ? ne(schema.residents.id, exceptResidentId) : undefined,
      ),
    );
}
