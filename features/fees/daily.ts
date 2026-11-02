import { and, asc, between, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import * as schema from "@/db/schema";
import type { Transaction } from "@/lib/db/client";
import { formatDateKey } from "@/lib/time/format";
import { localDateKey, toLocal } from "@/lib/time/zoned";

import { activeMembersWithRoles } from "../emergency/queries";
import { createNotifications } from "../notifications/service";
import { addDays } from "./schedule";
import { CHARGE_HORIZON_DAYS, ensureCharges, voidChargesAfterDischarge } from "./service";

/*
 * Trabajo diario del abono (7.3-C4), en el worker con withSystemTenant:
 * 1. genera las cuotas que faltan (la próxima de cada paciente siempre existe);
 * 2. anula las que vencen después de un egreso y no tienen pagos;
 * 3. avisa a Administración y Dirección de las cuotas impagas que vencen
 *    en los próximos días (feeReminderDaysBefore, 7 por defecto). Un aviso
 *    por cuota y por persona: si el trabajo se reintenta, no se repite.
 *    Monto 0 no genera cuotas, así que no avisa (DC-22).
 * Devuelve cuántos avisos nuevos recibió cada persona, para el email del día.
 */
export async function runDailyFees(
  tx: Transaction,
  organizationId: string,
  now: Date,
): Promise<{
  chargesCreated: number;
  chargesVoided: number;
  newReminders: Map<string, { count: number; days: number }>;
}> {
  const sites = await tx
    .select({
      id: schema.sites.id,
      timezone: schema.sites.timezone,
      days: schema.sites.feeReminderDaysBefore,
    })
    .from(schema.sites)
    .where(eq(schema.sites.organizationId, organizationId));
  let chargesCreated = 0;
  let chargesVoided = 0;
  const newReminders = new Map<string, { count: number; days: number }>();
  const recipients = await activeMembersWithRoles(tx, organizationId, ["admin", "direccion"]);

  for (const site of sites) {
    const today = localDateKey(toLocal(now, site.timezone));
    const billable = await tx
      .select({ id: schema.residents.id })
      .from(schema.residents)
      .innerJoin(
        schema.residentFeePlans,
        and(
          eq(schema.residentFeePlans.residentId, schema.residents.id),
          isNull(schema.residentFeePlans.effectiveTo),
        ),
      )
      .where(
        and(
          eq(schema.residents.siteId, site.id),
          inArray(schema.residents.status, ["active", "hospitalized"]),
        ),
      );
    for (const resident of billable) {
      chargesCreated += await ensureCharges(tx, resident.id, addDays(today, CHARGE_HORIZON_DAYS));
    }

    const discharged = await tx
      .select({ id: schema.residents.id, dischargeDate: schema.residents.dischargeDate })
      .from(schema.residents)
      .where(
        and(
          eq(schema.residents.siteId, site.id),
          eq(schema.residents.status, "discharged"),
          isNotNull(schema.residents.dischargeDate),
        ),
      );
    for (const resident of discharged) {
      chargesVoided += await voidChargesAfterDischarge(tx, resident.id, resident.dischargeDate!);
    }

    const dueSoon = await tx
      .select({
        id: schema.feeCharges.id,
        dueDate: schema.feeCharges.dueDate,
        residentId: schema.feeCharges.residentId,
        firstName: schema.residents.firstName,
        lastName: schema.residents.lastName,
      })
      .from(schema.feeCharges)
      .innerJoin(schema.residents, eq(schema.residents.id, schema.feeCharges.residentId))
      .where(
        and(
          eq(schema.feeCharges.siteId, site.id),
          eq(schema.feeCharges.status, "pending"),
          between(schema.feeCharges.dueDate, today, addDays(today, site.days)),
        ),
      )
      .orderBy(asc(schema.feeCharges.dueDate));
    if (dueSoon.length === 0) continue;

    for (const recipient of recipients) {
      // En la app: con el nombre y la fecha (quien lo recibe ve los abonos);
      // el monto, en la ficha. El email del día no lleva ni nombres ni montos.
      const created = await createNotifications(
        tx,
        organizationId,
        dueSoon.map((charge) => ({
          recipientUserId: recipient.userId,
          type: "fee.due_soon",
          entityType: "fee_charge",
          entityId: charge.id,
          title: "Vence una cuota del abono",
          body: `${charge.firstName} ${charge.lastName}: vence el ${formatDateKey(charge.dueDate)}.`,
          link: `/pacientes/${charge.residentId}?tab=abono`,
          dedupeKey: `fee.due_soon:${charge.id}:${recipient.userId}`,
        })),
      );
      if (created > 0) {
        const previous = newReminders.get(recipient.userId);
        newReminders.set(recipient.userId, {
          count: (previous?.count ?? 0) + created,
          days: site.days,
        });
      }
    }
  }
  return { chargesCreated, chargesVoided, newReminders };
}
