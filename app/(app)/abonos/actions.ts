"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import * as schema from "@/db/schema";
import {
  feeSetupSchema,
  paymentMethodSchema,
  paymentSchema,
  priceChangeSchema,
  voidPaymentSchema,
} from "@/features/fees/schemas";
import { addDays } from "@/features/fees/schedule";
import {
  CHARGE_HORIZON_DAYS,
  changePrice,
  ensureCharges,
  registerPayment,
  setupFeePlan,
  voidPayment,
} from "@/features/fees/service";
import { getResident } from "@/features/residents/queries";
import { inTenant, runAction } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { DomainError } from "@/lib/errors";
import { fieldErrorsFrom, formValues, type FormState } from "@/lib/forms";
import { getSiteContext } from "@/lib/site/server";
import { and, eq } from "drizzle-orm";

/*
 * Acciones del abono (7.3-C4). Todas piden fees.manage (Administración y
 * Dirección); la base lo vuelve a exigir en sus políticas (12.10).
 */

const id = z.uuid();
const PERMISSION = "fees.manage";

/** Fijar el abono de un paciente que todavía no tiene (por ejemplo, ingresado antes). */
export async function setupFeeAction(
  residentId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (!id.safeParse(residentId).success) return { error: "Paciente inválido.", values };
  const parsed = feeSetupSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  return runAction(
    PERMISSION,
    async (context) => {
      const { today } = await getSiteContext(context);
      await inTenant(context, async (tx) => {
        const resident = await getResident(tx, residentId);
        if (!resident || !["active", "hospitalized"].includes(resident.status)) {
          throw new DomainError("El abono se fija a pacientes activos.");
        }
        await setupFeePlan(tx, context.tenant, resident, parsed.data, today);
        await ensureCharges(tx, residentId, addDays(today, CHARGE_HORIZON_DAYS));
      });
      refresh();
      return { success: "Abono guardado." };
    },
    { values },
  );
}

export async function registerPaymentAction(
  chargeId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const clientRequestId = id.safeParse(formData.get("clientRequestId"));
  if (!id.safeParse(chargeId).success || !clientRequestId.success) {
    return { error: "Volvé a abrir el formulario.", values };
  }
  const parsed = paymentSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  return runAction(
    PERMISSION,
    async (context) => {
      const { today } = await getSiteContext(context);
      await inTenant(context, (tx) =>
        registerPayment(
          tx,
          context.tenant,
          chargeId,
          { ...parsed.data, clientRequestId: clientRequestId.data },
          today,
        ),
      );
      refresh();
      return { success: "Pago registrado." };
    },
    { values },
  );
}

export async function voidPaymentAction(
  paymentId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (!id.safeParse(paymentId).success) return { error: "Pago inválido.", values };
  const parsed = voidPaymentSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  return runAction(
    PERMISSION,
    async (context) => {
      await inTenant(context, (tx) =>
        voidPayment(tx, context.tenant, paymentId, parsed.data.reason),
      );
      refresh();
      return { success: "Pago anulado." };
    },
    { values },
  );
}

export async function changePriceAction(
  residentId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (!id.safeParse(residentId).success) return { error: "Paciente inválido.", values };
  const parsed = priceChangeSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  return runAction(
    PERMISSION,
    async (context) => {
      const { today } = await getSiteContext(context);
      await inTenant(context, async (tx) => {
        await changePrice(tx, context.tenant, residentId, parsed.data, today);
        await ensureCharges(tx, residentId, addDays(today, CHARGE_HORIZON_DAYS));
      });
      refresh();
      return { success: "Precio actualizado. Rige desde la próxima cuota sin pagos." };
    },
    { values },
  );
}

/** Medios de pago de la sede (DC-21), en Configuración. */
export async function savePaymentMethodAction(
  methodId: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (methodId && !id.safeParse(methodId).success) return { error: "Medio inválido.", values };
  const parsed = paymentMethodSchema.safeParse(methodId ? values : { ...values, active: "on" });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  return runAction(
    "settings.manage",
    async (context) => {
      const { site } = await getSiteContext(context);
      await inTenant(context, async (tx) => {
        const [duplicate] = await tx
          .select({ id: schema.paymentMethods.id })
          .from(schema.paymentMethods)
          .where(
            and(
              eq(schema.paymentMethods.siteId, site.id),
              eq(schema.paymentMethods.name, parsed.data.name),
            ),
          );
        if (duplicate && duplicate.id !== methodId) {
          throw new DomainError("Ya hay un medio con ese nombre.", "name");
        }
        if (methodId) {
          await tx
            .update(schema.paymentMethods)
            .set(parsed.data)
            .where(eq(schema.paymentMethods.id, methodId));
        } else {
          await tx.insert(schema.paymentMethods).values({
            organizationId: context.tenant.organizationId,
            siteId: site.id,
            name: parsed.data.name,
            position: 99,
          });
        }
        await recordAudit(tx, context.tenant, {
          action: methodId ? "settings.payment_method_updated" : "settings.payment_method_created",
          entityType: "payment_method",
          entityId: methodId,
          siteId: site.id,
          metadata: { name: parsed.data.name, active: parsed.data.active },
        });
      });
      refresh();
      return { success: methodId ? "Medio de pago guardado." : "Medio de pago agregado." };
    },
    { values },
  );
}
