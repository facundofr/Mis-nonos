import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import * as schema from "@/db/schema";
import { HANDOVER_NOTE_MAX_LENGTH } from "@/db/schema/notes";
import { recordAudit } from "@/lib/audit";
import type { Transaction } from "@/lib/db/client";
import type { TenantContext } from "@/lib/db/tenant";
import { CONCURRENT_CHANGE_MESSAGE, DomainError } from "@/lib/errors";
import { shiftOccurrenceOn, type ShiftOccurrence } from "@/lib/time/shifts";

import { canConfirmAt, canDeliverAt } from "./rules";

/*
 * Traspaso de turno (7.3-G, F.4). Los permisos (handover.deliver,
 * handover.confirm) los verifica la Server Action; acá van las reglas de
 * tiempo y la auditoría (sin copiar la nota: queda en las versiones).
 */

export const deliverSchema = z.object({
  note: z
    .string()
    .trim()
    .max(HANDOVER_NOTE_MAX_LENGTH, `Como máximo ${HANDOVER_NOTE_MAX_LENGTH} caracteres.`)
    .optional()
    .transform((value) => value || null),
});
export type DeliverInput = z.infer<typeof deliverSchema>;

async function loadOccurrence(
  tx: Transaction,
  siteId: string,
  shiftId: string,
  shiftDate: string,
): Promise<{
  occurrence: ShiftOccurrence;
  timezone: string;
  requiresConfirmation: boolean;
  shifts: (typeof schema.shifts.$inferSelect)[];
}> {
  const [site] = await tx
    .select({
      timezone: schema.sites.timezone,
      requiresConfirmation: schema.sites.handoverRequiresConfirmation,
    })
    .from(schema.sites)
    .where(eq(schema.sites.id, siteId));
  if (!site) throw new DomainError("La sede no existe.");
  const shifts = await tx.select().from(schema.shifts).where(eq(schema.shifts.siteId, siteId));
  const shift = shifts.find((item) => item.id === shiftId);
  if (!shift) throw new DomainError("Ese turno no existe.");
  return {
    occurrence: shiftOccurrenceOn(shift, shiftDate, site.timezone),
    timezone: site.timezone,
    requiresConfirmation: site.requiresConfirmation,
    shifts,
  };
}

/**
 * Entregar el turno (F.4): desde 1 h antes hasta 2 h después del fin. Si
 * ya se entregó, otra entrega es una versión nueva (salvo que el turno
 * entrante ya la haya confirmado).
 */
export async function deliverHandover(
  tx: Transaction,
  actor: TenantContext,
  input: DeliverInput & {
    siteId: string;
    shiftId: string;
    shiftDate: string;
    /** 0 = todavía no se entregó. */
    expectedVersion: number;
  },
  now = new Date(),
): Promise<void> {
  const { occurrence } = await loadOccurrence(tx, input.siteId, input.shiftId, input.shiftDate);
  if (!canDeliverAt(occurrence, now)) {
    throw new DomainError(
      "El turno se entrega desde 1 h antes hasta 2 h después de que termina. Ahora no se puede.",
    );
  }

  let handoverId: string;
  let version: number;
  if (input.expectedVersion === 0) {
    const [created] = await tx
      .insert(schema.shiftHandovers)
      .values({
        organizationId: actor.organizationId,
        siteId: input.siteId,
        shiftId: input.shiftId,
        shiftDate: input.shiftDate,
        note: input.note,
        deliveredBy: actor.userId,
        deliveredAt: now,
      })
      .onConflictDoNothing()
      .returning({ id: schema.shiftHandovers.id });
    if (!created) throw new DomainError(CONCURRENT_CHANGE_MESSAGE);
    handoverId = created.id;
    version = 1;
  } else {
    version = input.expectedVersion + 1;
    const [updated] = await tx
      .update(schema.shiftHandovers)
      .set({ note: input.note, version, deliveredBy: actor.userId, deliveredAt: now })
      .where(
        and(
          eq(schema.shiftHandovers.siteId, input.siteId),
          eq(schema.shiftHandovers.shiftId, input.shiftId),
          eq(schema.shiftHandovers.shiftDate, input.shiftDate),
          eq(schema.shiftHandovers.version, input.expectedVersion),
          isNull(schema.shiftHandovers.confirmedAt),
        ),
      )
      .returning({ id: schema.shiftHandovers.id });
    if (!updated) {
      const [current] = await tx
        .select({ confirmedAt: schema.shiftHandovers.confirmedAt })
        .from(schema.shiftHandovers)
        .where(
          and(
            eq(schema.shiftHandovers.siteId, input.siteId),
            eq(schema.shiftHandovers.shiftId, input.shiftId),
            eq(schema.shiftHandovers.shiftDate, input.shiftDate),
          ),
        );
      if (current?.confirmedAt) {
        throw new DomainError("El turno entrante ya confirmó la recepción: no se puede cambiar.");
      }
      throw new DomainError(CONCURRENT_CHANGE_MESSAGE);
    }
    handoverId = updated.id;
  }

  await tx.insert(schema.shiftHandoverVersions).values({
    organizationId: actor.organizationId,
    handoverId,
    version,
    note: input.note,
    deliveredBy: actor.userId,
    deliveredAt: now,
  });
  await recordAudit(tx, actor, {
    action: "handover.delivered",
    entityType: "shift_handover",
    entityId: handoverId,
    siteId: input.siteId,
    changes: null,
    metadata: {
      shiftId: input.shiftId,
      shiftDate: input.shiftDate,
      version,
      withNote: input.note !== null,
    },
  });
}

/**
 * Confirmar la recepción (F.4): solo si la sede la pide, después de la
 * entrega y mientras dura el turno entrante.
 */
export async function confirmHandover(
  tx: Transaction,
  actor: TenantContext,
  input: { siteId: string; shiftId: string; shiftDate: string },
  now = new Date(),
): Promise<void> {
  const { occurrence, timezone, requiresConfirmation, shifts } = await loadOccurrence(
    tx,
    input.siteId,
    input.shiftId,
    input.shiftDate,
  );
  if (!requiresConfirmation) {
    throw new DomainError("Esta sede no pide confirmar la recepción del turno.");
  }
  if (!canConfirmAt(shifts, occurrence, timezone, now)) {
    throw new DomainError("La recepción se confirma durante el turno entrante.");
  }
  const [confirmed] = await tx
    .update(schema.shiftHandovers)
    .set({ confirmedBy: actor.userId, confirmedAt: sql`now()` })
    .where(
      and(
        eq(schema.shiftHandovers.siteId, input.siteId),
        eq(schema.shiftHandovers.shiftId, input.shiftId),
        eq(schema.shiftHandovers.shiftDate, input.shiftDate),
        isNull(schema.shiftHandovers.confirmedAt),
      ),
    )
    .returning({ id: schema.shiftHandovers.id });
  if (!confirmed) {
    throw new DomainError("No hay una entrega para confirmar, o ya estaba confirmada.");
  }
  await recordAudit(tx, actor, {
    action: "handover.confirmed",
    entityType: "shift_handover",
    entityId: confirmed.id,
    siteId: input.siteId,
    changes: null,
    metadata: { shiftId: input.shiftId, shiftDate: input.shiftDate },
  });
}
