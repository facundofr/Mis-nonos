import { and, eq, inArray } from "drizzle-orm";

import * as schema from "@/db/schema";
import { recordAudit } from "@/lib/audit";
import type { Transaction } from "@/lib/db/client";
import type { TenantContext } from "@/lib/db/tenant";
import { CONCURRENT_CHANGE_MESSAGE, DomainError } from "@/lib/errors";
import { emitDomainEvent } from "@/lib/events";

import { contactSchema, residentDataSchema } from "../residents/schemas";
import {
  assertUniqueNationalId,
  completeAdmissionStep,
  saveContact,
  startAdmission,
} from "../residents/service";
import { ALLOWED_FROM, type DiscardInput, extraContacts, type RequestInput } from "./schemas";

/*
 * Reglas de las solicitudes de ingreso (7.3-C3, DC-18). Los permisos
 * (admission_requests.manage) los verifica la Server Action. La auditoría
 * registra las acciones sin copiar los datos de la familia: así se pueden
 * borrar al vencer el plazo (DC-14).
 */

async function requireOpen(tx: Transaction, requestId: string, target: keyof typeof ALLOWED_FROM) {
  const [request] = await tx
    .select()
    .from(schema.admissionRequests)
    .where(eq(schema.admissionRequests.id, requestId));
  if (!request) throw new DomainError("Esa solicitud no existe.");
  if (!(ALLOWED_FROM[target] as readonly string[]).includes(request.status)) {
    throw new DomainError("La solicitud ya está cerrada (convertida o descartada).");
  }
  return request;
}

async function audit(
  tx: Transaction,
  actor: TenantContext,
  request: { id: string; siteId: string },
  action: string,
  metadata: Record<string, unknown>,
) {
  await recordAudit(tx, actor, {
    action,
    entityType: "admission_request",
    entityId: request.id,
    siteId: request.siteId,
    changes: null,
    metadata,
  });
}

/** Carga manual (F1-SOL-01). El mismo envío dos veces devuelve la misma solicitud. */
export async function createRequest(
  tx: Transaction,
  actor: TenantContext,
  siteId: string,
  input: RequestInput,
  clientRequestId: string,
): Promise<string> {
  const [created] = await tx
    .insert(schema.admissionRequests)
    .values({
      organizationId: actor.organizationId,
      siteId,
      origin: "staff",
      ...input,
      clientRequestId,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    })
    .onConflictDoNothing({
      target: [schema.admissionRequests.organizationId, schema.admissionRequests.clientRequestId],
    })
    .returning({ id: schema.admissionRequests.id });
  if (!created) {
    const [existing] = await tx
      .select({ id: schema.admissionRequests.id })
      .from(schema.admissionRequests)
      .where(eq(schema.admissionRequests.clientRequestId, clientRequestId));
    if (!existing) throw new DomainError(CONCURRENT_CHANGE_MESSAGE);
    return existing.id;
  }
  await audit(tx, actor, { id: created.id, siteId }, "admission_request.created", {
    origin: "staff",
    channel: input.contactChannel,
  });
  // Aviso a Administración y Dirección, sin datos del paciente (10.6).
  await emitDomainEvent(tx, actor, {
    type: "admission_request.created",
    entityType: "admission_request",
    entityId: created.id,
    siteId,
    payload: { createdBy: actor.userId },
  });
  return created.id;
}

export async function updateRequest(
  tx: Transaction,
  actor: TenantContext,
  requestId: string,
  expectedVersion: number,
  input: RequestInput,
): Promise<void> {
  const request = await requireOpen(tx, requestId, "contacting");
  const updated = await tx
    .update(schema.admissionRequests)
    .set({ ...input, version: expectedVersion + 1, updatedBy: actor.userId })
    .where(
      and(
        eq(schema.admissionRequests.id, requestId),
        eq(schema.admissionRequests.version, expectedVersion),
      ),
    )
    .returning({ id: schema.admissionRequests.id });
  if (updated.length === 0) throw new DomainError(CONCURRENT_CHANGE_MESSAGE);
  await audit(tx, actor, request, "admission_request.updated", { version: expectedVersion + 1 });
}

/** En contacto / en espera (sin vacante). */
export async function changeRequestStatus(
  tx: Transaction,
  actor: TenantContext,
  requestId: string,
  status: "contacting" | "waitlisted",
): Promise<void> {
  const request = await requireOpen(tx, requestId, status);
  if (request.status === status) return;
  await tx
    .update(schema.admissionRequests)
    .set({ status, updatedBy: actor.userId, version: request.version + 1 })
    .where(
      and(
        eq(schema.admissionRequests.id, requestId),
        inArray(schema.admissionRequests.status, [...ALLOWED_FROM[status]]),
      ),
    );
  await audit(tx, actor, request, "admission_request.status_changed", {
    from: request.status,
    to: status,
  });
}

/** Descartar exige un motivo (7.3-C3). */
export async function discardRequest(
  tx: Transaction,
  actor: TenantContext,
  requestId: string,
  input: DiscardInput,
): Promise<void> {
  const request = await requireOpen(tx, requestId, "discarded");
  await tx
    .update(schema.admissionRequests)
    .set({
      status: "discarded",
      discardReason: input.discardReason,
      discardNotes: input.discardNotes,
      updatedBy: actor.userId,
      version: request.version + 1,
    })
    .where(eq(schema.admissionRequests.id, requestId));
  await audit(tx, actor, request, "admission_request.discarded", { reason: input.discardReason });
}

/**
 * Convertir en ingreso (F1-SOL-02), en una sola transacción: crea el
 * borrador del ingreso guiado con el paso 1 (paciente y cobertura) y los
 * contactos del paso 2, y deja la solicitud vinculada. Si ya hay un
 * paciente con el mismo DNI, no convierte.
 */
export async function convertRequest(
  tx: Transaction,
  actor: TenantContext,
  requestId: string,
  today: string,
): Promise<{ admissionId: string; residentId: string }> {
  const request = await requireOpen(tx, requestId, "converted");

  const parsed = residentDataSchema.safeParse({
    firstName: request.firstName,
    lastName: request.lastName,
    nationalId: request.nationalId ?? "",
    birthDate: request.birthDate ?? "",
    admissionDate: request.desiredAdmissionDate ?? today,
    referralInstitution: request.referralInstitution ?? "",
    admissionModality: request.admissionModality ?? "",
    coverageType: request.coverageType ?? "",
    coverageName: request.coverageName ?? "",
    coverageMemberNumber: request.coverageMemberNumber ?? "",
  });
  if (!parsed.success) {
    const missing = [
      ...new Set(
        parsed.error.issues.map((issue) =>
          issue.path[0] === "admissionModality"
            ? "la modalidad"
            : issue.path[0] === "coverageType"
              ? "la cobertura"
              : issue.path[0] === "coverageMemberNumber"
                ? "el n.º de beneficiario o afiliado"
                : "los datos del paciente",
        ),
      ),
    ];
    throw new DomainError(`Para convertirla, completá ${missing.join(", ")} (botón «Editar»).`);
  }
  await assertUniqueNationalId(tx, parsed.data.nationalId);

  const { residentId, admissionId } = await startAdmission(tx, actor, request.siteId, parsed.data);
  await completeAdmissionStep(tx, admissionId, 1);

  // El responsable de la internación lleva DNI y domicilio: si la
  // solicitud no los tiene, entra como contacto y se marca en el paso 2.
  const hasResponsible = Boolean(request.responsibleNationalId && request.responsibleAddress);
  await saveContact(
    tx,
    actor,
    residentId,
    null,
    contactSchema.parse({
      name: request.responsibleName,
      relationship: request.responsibleRelationship ?? "",
      nationalId: request.responsibleNationalId ?? "",
      address: request.responsibleAddress ?? "",
      phoneMobile: request.responsiblePhone,
      email: request.responsibleEmail ?? "",
      emergencyPriority: "1",
      isAdmissionResponsible: hasResponsible ? "on" : undefined,
      canReceiveInfo: "on",
    }),
    today,
  );
  for (const [index, contact] of extraContacts({
    contact2Name: request.contact2Name,
    contact2Relationship: request.contact2Relationship,
    contact2Phone: request.contact2Phone,
    contact3Name: request.contact3Name,
    contact3Relationship: request.contact3Relationship,
    contact3Phone: request.contact3Phone,
  } as RequestInput).entries()) {
    await saveContact(
      tx,
      actor,
      residentId,
      null,
      contactSchema.parse({
        name: contact.name,
        relationship: contact.relationship ?? "",
        phoneMobile: contact.phone,
        emergencyPriority: String(index + 2),
      }),
      today,
    );
  }
  if (hasResponsible) await completeAdmissionStep(tx, admissionId, 2);

  const converted = await tx
    .update(schema.admissionRequests)
    .set({
      status: "converted",
      convertedAdmissionId: admissionId,
      updatedBy: actor.userId,
      version: request.version + 1,
    })
    .where(
      and(
        eq(schema.admissionRequests.id, requestId),
        eq(schema.admissionRequests.version, request.version),
      ),
    )
    .returning({ id: schema.admissionRequests.id });
  if (converted.length === 0) throw new DomainError(CONCURRENT_CHANGE_MESSAGE);
  await audit(tx, actor, request, "admission_request.converted", { admissionId, residentId });
  return { admissionId, residentId };
}
