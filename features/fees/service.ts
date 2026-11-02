import { and, asc, desc, eq, gt, inArray, isNull, ne, sql } from "drizzle-orm";

import * as schema from "@/db/schema";
import { diffChanges, recordAudit } from "@/lib/audit";
import type { Transaction } from "@/lib/db/client";
import type { TenantContext } from "@/lib/db/tenant";
import { CONCURRENT_CHANGE_MESSAGE, DomainError } from "@/lib/errors";

import { fromCents, toCents } from "./money";
import type { FeeSetupInput, PaymentInput, PriceChangeInput } from "./schemas";
import { addDays, dayOf, dueDatesBetween, nextDueDate, periodFor } from "./schedule";

/*
 * Reglas del abono (7.3-C4, confirmadas: DC-20 a DC-24). Los permisos
 * (fees.read, fees.manage) los verifica la Server Action y, además, la
 * base (políticas con app.current_user_can). Todo pago y todo cambio de
 * precio quedan en la auditoría, con entity_type propio: no aparecen en la
 * Actividad del paciente, que ven también Enfermería y Cuidado (12.10).
 */

/** Las cuotas se generan hasta esta cantidad de días adelante (la próxima siempre existe). */
export const CHARGE_HORIZON_DAYS = 35;

const BILLABLE = ["active", "hospitalized"];

type Actor = { organizationId: string; userId: string | null };

async function currentPlan(tx: Transaction, residentId: string) {
  const [plan] = await tx
    .select()
    .from(schema.residentFeePlans)
    .where(
      and(
        eq(schema.residentFeePlans.residentId, residentId),
        isNull(schema.residentFeePlans.effectiveTo),
      ),
    );
  return plan ?? null;
}

/** Suma de los pagos vigentes (no anulados) de una cuota, en centavos. */
async function paidCents(tx: Transaction, chargeId: string): Promise<bigint> {
  const [row] = await tx
    .select({
      total: sql<string>`coalesce(sum(${schema.feePayments.amount}), 0)::numeric(14, 2)::text`,
    })
    .from(schema.feePayments)
    .where(and(eq(schema.feePayments.chargeId, chargeId), isNull(schema.feePayments.voidedAt)));
  return toCents(row?.total ?? "0.00");
}

async function auditFee(
  tx: Transaction,
  actor: Actor,
  input: {
    action: string;
    entityType: "fee_charge" | "resident_fee_plan" | "fee_payment";
    entityId: string;
    siteId: string | null;
    residentId: string;
    changes?: ReturnType<typeof diffChanges>;
    metadata?: Record<string, unknown>;
  },
) {
  await recordAudit(tx, actor, {
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    siteId: input.siteId,
    changes: input.changes ?? null,
    metadata: { residentId: input.residentId, ...input.metadata },
  });
}

/**
 * Crea las cuotas que faltan de un paciente hasta `horizon` (incluido),
 * con el precio vigente. Sin plan, con monto 0 o sin estar activo (o
 * internado fuera), no genera nada. Repetirla no duplica.
 */
export async function ensureCharges(
  tx: Transaction,
  residentId: string,
  horizon: string,
): Promise<number> {
  const [resident] = await tx
    .select({ status: schema.residents.status, siteId: schema.residents.siteId })
    .from(schema.residents)
    .where(eq(schema.residents.id, residentId));
  if (!resident || !BILLABLE.includes(resident.status)) return 0;
  const plan = await currentPlan(tx, residentId);
  if (!plan || toCents(plan.amount) === 0n) return 0;

  const [latest] = await tx
    .select({ dueDate: schema.feeCharges.dueDate })
    .from(schema.feeCharges)
    .where(and(eq(schema.feeCharges.residentId, residentId), ne(schema.feeCharges.status, "void")))
    .orderBy(desc(schema.feeCharges.dueDate))
    .limit(1);
  const from = latest ? nextDueDate(latest.dueDate, plan.billingDay) : plan.firstDueDate;
  const dates = dueDatesBetween(from, horizon, plan.billingDay);
  if (dates.length === 0) return 0;
  const result = await tx
    .insert(schema.feeCharges)
    .values(
      dates.map((dueDate) => {
        const period = periodFor(dueDate, plan.billingDay);
        return {
          organizationId: plan.organizationId,
          siteId: resident.siteId,
          residentId,
          feePlanId: plan.id,
          periodStart: period.start,
          periodEnd: period.end,
          dueDate,
          amount: plan.amount,
        };
      }),
    )
    .onConflictDoNothing({ target: [schema.feeCharges.residentId, schema.feeCharges.dueDate] });
  return result.rowCount ?? 0;
}

/**
 * Paso 4 del ingreso (7.3-C4): fija el abono y el próximo vencimiento. Si
 * el primer mes se cobró al ingresar, registra esa cuota y su pago.
 */
export async function setupFeePlan(
  tx: Transaction,
  actor: TenantContext,
  resident: { id: string; siteId: string; admissionDate: string | null },
  input: FeeSetupInput,
  today: string,
): Promise<void> {
  const admissionDate = resident.admissionDate ?? today;
  if (input.firstDueDate <= admissionDate) {
    throw new DomainError(
      "El próximo vencimiento tiene que ser después del ingreso.",
      "firstDueDate",
    );
  }
  if (await currentPlan(tx, resident.id)) {
    throw new DomainError("Este paciente ya tiene un abono.");
  }
  const billingDay = dayOf(input.firstDueDate);
  const [plan] = await tx
    .insert(schema.residentFeePlans)
    .values({
      organizationId: actor.organizationId,
      residentId: resident.id,
      amount: input.feeAmount,
      billingDay,
      firstDueDate: input.firstDueDate,
      effectiveFrom: admissionDate,
      reason: "Ingreso",
      createdBy: actor.userId,
    })
    .returning({ id: schema.residentFeePlans.id });
  await auditFee(tx, actor, {
    action: "fee.plan_created",
    entityType: "resident_fee_plan",
    entityId: plan!.id,
    siteId: resident.siteId,
    residentId: resident.id,
    changes: diffChanges(null, { amount: input.feeAmount, billingDay }),
  });

  if (input.firstMonthPaid && toCents(input.feeAmount) > 0n) {
    const [charge] = await tx
      .insert(schema.feeCharges)
      .values({
        organizationId: actor.organizationId,
        siteId: resident.siteId,
        residentId: resident.id,
        feePlanId: plan!.id,
        periodStart: admissionDate,
        periodEnd: addDays(input.firstDueDate, -1),
        dueDate: admissionDate,
        amount: input.feeAmount,
        status: "paid",
      })
      .returning({ id: schema.feeCharges.id });
    const [payment] = await tx
      .insert(schema.feePayments)
      .values({
        organizationId: actor.organizationId,
        chargeId: charge!.id,
        residentId: resident.id,
        amount: input.feeAmount,
        paidOn: admissionDate,
        methodId: input.firstPaymentMethodId!,
        notes: "Primer mes, cobrado al ingreso",
        receivedBy: actor.userId,
        clientRequestId: crypto.randomUUID(),
      })
      .returning({ id: schema.feePayments.id });
    await auditFee(tx, actor, {
      action: "fee.payment_registered",
      entityType: "fee_payment",
      entityId: payment!.id,
      siteId: resident.siteId,
      residentId: resident.id,
      changes: diffChanges(null, { amount: input.feeAmount }),
      metadata: { chargeId: charge!.id, firstMonth: true },
    });
  }
}

/** Registrar un pago (DC-20: puede ser parcial). No puede superar el saldo. */
export async function registerPayment(
  tx: Transaction,
  actor: TenantContext,
  chargeId: string,
  input: PaymentInput & { clientRequestId: string },
  today: string,
): Promise<void> {
  if (input.paidOn > today)
    throw new DomainError("La fecha del pago no puede ser futura.", "paidOn");
  // Bloquea la cuota: dos pagos a la vez no pueden pasarse del saldo.
  const [charge] = await tx
    .select()
    .from(schema.feeCharges)
    .where(eq(schema.feeCharges.id, chargeId))
    .for("update");
  if (!charge) throw new DomainError("Esa cuota no existe.");
  const [existing] = await tx
    .select({ id: schema.feePayments.id })
    .from(schema.feePayments)
    .where(eq(schema.feePayments.clientRequestId, input.clientRequestId));
  if (existing) return; // El mismo envío dos veces: ya quedó registrado.
  if (charge.status !== "pending") throw new DomainError("Esa cuota no está pendiente.");

  const [method] = await tx
    .select({ active: schema.paymentMethods.active })
    .from(schema.paymentMethods)
    .where(eq(schema.paymentMethods.id, input.methodId));
  if (!method?.active) throw new DomainError("Elegí el medio de pago.", "methodId");

  const balance = toCents(charge.amount) - (await paidCents(tx, chargeId));
  const amount = toCents(input.amount);
  if (amount > balance) {
    throw new DomainError(`El pago supera el saldo de la cuota (${fromCents(balance)}).`, "amount");
  }
  const [payment] = await tx
    .insert(schema.feePayments)
    .values({
      organizationId: actor.organizationId,
      chargeId,
      residentId: charge.residentId,
      amount: input.amount,
      paidOn: input.paidOn,
      methodId: input.methodId,
      notes: input.notes,
      receivedBy: actor.userId,
      clientRequestId: input.clientRequestId,
    })
    .returning({ id: schema.feePayments.id });
  if (amount === balance) {
    await tx
      .update(schema.feeCharges)
      .set({ status: "paid" })
      .where(eq(schema.feeCharges.id, chargeId));
  }
  await auditFee(tx, actor, {
    action: "fee.payment_registered",
    entityType: "fee_payment",
    entityId: payment!.id,
    siteId: charge.siteId,
    residentId: charge.residentId,
    changes: diffChanges(null, { amount: input.amount, paidOn: input.paidOn }),
    metadata: { chargeId, balanceAfter: fromCents(balance - amount) },
  });
}

/** Un pago no se borra: se anula con motivo y la cuota vuelve a tener saldo. */
export async function voidPayment(
  tx: Transaction,
  actor: TenantContext,
  paymentId: string,
  reason: string,
): Promise<void> {
  const [payment] = await tx
    .update(schema.feePayments)
    .set({ voidedAt: sql`now()`, voidedBy: actor.userId, voidReason: reason })
    .where(and(eq(schema.feePayments.id, paymentId), isNull(schema.feePayments.voidedAt)))
    .returning();
  if (!payment) throw new DomainError("Ese pago no existe o ya estaba anulado.");
  const [charge] = await tx
    .update(schema.feeCharges)
    .set({ status: "pending" })
    .where(and(eq(schema.feeCharges.id, payment.chargeId), eq(schema.feeCharges.status, "paid")))
    .returning({ siteId: schema.feeCharges.siteId });
  await auditFee(tx, actor, {
    action: "fee.payment_voided",
    entityType: "fee_payment",
    entityId: paymentId,
    siteId: charge?.siteId ?? null,
    residentId: payment.residentId,
    changes: diffChanges({ amount: payment.amount }, { amount: null }),
    metadata: { chargeId: payment.chargeId, reason },
  });
}

/**
 * Cambiar el precio (7.3-C4): guarda el anterior con fecha y motivo y
 * aplica desde la próxima cuota sin pagar (las que no tienen pagos).
 */
export async function changePrice(
  tx: Transaction,
  actor: TenantContext,
  residentId: string,
  input: PriceChangeInput,
  today: string,
): Promise<void> {
  const plan = await currentPlan(tx, residentId);
  if (!plan) throw new DomainError("Este paciente no tiene abono.");
  if (plan.amount === input.amount) throw new DomainError("Es el mismo precio.", "amount");
  const closed = await tx
    .update(schema.residentFeePlans)
    .set({ effectiveTo: today < plan.effectiveFrom ? plan.effectiveFrom : today })
    .where(
      and(eq(schema.residentFeePlans.id, plan.id), isNull(schema.residentFeePlans.effectiveTo)),
    )
    .returning({ id: schema.residentFeePlans.id });
  if (closed.length === 0) throw new DomainError(CONCURRENT_CHANGE_MESSAGE);

  // Próximo vencimiento sin cuota: desde ahí sigue la serie si no hay cuotas.
  const [latest] = await tx
    .select({ dueDate: schema.feeCharges.dueDate })
    .from(schema.feeCharges)
    .where(and(eq(schema.feeCharges.residentId, residentId), ne(schema.feeCharges.status, "void")))
    .orderBy(desc(schema.feeCharges.dueDate))
    .limit(1);
  const [next] = await tx
    .insert(schema.residentFeePlans)
    .values({
      organizationId: actor.organizationId,
      residentId,
      amount: input.amount,
      billingDay: plan.billingDay,
      firstDueDate: latest ? nextDueDate(latest.dueDate, plan.billingDay) : plan.firstDueDate,
      effectiveFrom: today < plan.effectiveFrom ? plan.effectiveFrom : today,
      reason: input.reason,
      createdBy: actor.userId,
    })
    .returning({ id: schema.residentFeePlans.id });

  // Las cuotas pendientes sin pagos pasan al precio nuevo (o se anulan si es 0).
  const pending = await tx
    .select({ id: schema.feeCharges.id, siteId: schema.feeCharges.siteId })
    .from(schema.feeCharges)
    .where(
      and(
        eq(schema.feeCharges.residentId, residentId),
        eq(schema.feeCharges.status, "pending"),
        sql`not exists (select 1 from fee_payments p where p.charge_id = fee_charges.id and p.voided_at is null)`,
      ),
    )
    .orderBy(asc(schema.feeCharges.dueDate));
  if (pending.length > 0) {
    const ids = pending.map((charge) => charge.id);
    await tx
      .update(schema.feeCharges)
      .set(
        toCents(input.amount) === 0n
          ? { status: "void", voidReason: "Sin cargo desde el cambio de precio" }
          : { amount: input.amount, feePlanId: next!.id },
      )
      .where(inArray(schema.feeCharges.id, ids));
  }
  const [resident] = await tx
    .select({ siteId: schema.residents.siteId })
    .from(schema.residents)
    .where(eq(schema.residents.id, residentId));
  await auditFee(tx, actor, {
    action: "fee.price_changed",
    entityType: "resident_fee_plan",
    entityId: next!.id,
    siteId: resident?.siteId ?? null,
    residentId,
    changes: diffChanges({ amount: plan.amount }, { amount: input.amount }),
    metadata: { reason: input.reason, chargesUpdated: pending.length },
  });
}

/**
 * Egreso (7.3-C4): dejan de generarse cuotas. Las pendientes sin pagos que
 * vencen después del egreso se anulan; las que tienen saldo quedan.
 */
export async function voidChargesAfterDischarge(
  tx: Transaction,
  residentId: string,
  dischargeDate: string,
): Promise<number> {
  const result = await tx
    .update(schema.feeCharges)
    .set({ status: "void", voidReason: "Egreso" })
    .where(
      and(
        eq(schema.feeCharges.residentId, residentId),
        eq(schema.feeCharges.status, "pending"),
        gt(schema.feeCharges.dueDate, dischargeDate),
        sql`not exists (select 1 from fee_payments p where p.charge_id = fee_charges.id and p.voided_at is null)`,
      ),
    );
  return result.rowCount ?? 0;
}
