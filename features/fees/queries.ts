import { aliasedTable, and, asc, between, count, desc, eq, inArray, lt, sql } from "drizzle-orm";

import * as schema from "@/db/schema";
import type { Transaction } from "@/lib/db/client";

import { fromCents, toCents } from "./money";
import { displayStatus, type ChargeDisplayStatus } from "./schemas";
import { addDays, daysInMonth } from "./schedule";

/*
 * Lecturas del abono (dentro de withTenant). La base solo devuelve filas a
 * quien tiene fees.read (12.10); las pantallas, además, lo verifican.
 */

const paidSum = sql<string>`coalesce((
  select sum(p.amount) from fee_payments p
  where p.charge_id = fee_charges.id and p.voided_at is null
), 0)::numeric(14, 2)::text`;

export function listPaymentMethods(tx: Transaction, siteId: string, activeOnly = true) {
  return tx
    .select({
      id: schema.paymentMethods.id,
      name: schema.paymentMethods.name,
      active: schema.paymentMethods.active,
    })
    .from(schema.paymentMethods)
    .where(
      and(
        eq(schema.paymentMethods.siteId, siteId),
        activeOnly ? eq(schema.paymentMethods.active, true) : undefined,
      ),
    )
    .orderBy(asc(schema.paymentMethods.position), asc(schema.paymentMethods.name));
}

export interface ChargeItem {
  id: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  amount: string;
  paid: string;
  balance: string;
  status: ChargeDisplayStatus;
  voidReason: string | null;
}

function toItem(
  row: {
    id: string;
    dueDate: string;
    periodStart: string;
    periodEnd: string;
    amount: string;
    paid: string;
    status: string;
    voidReason: string | null;
  },
  today: string,
): ChargeItem {
  const balance = row.status === "void" ? 0n : toCents(row.amount) - toCents(row.paid);
  return {
    ...row,
    balance: fromCents(balance),
    status: displayStatus(row.status, row.dueDate, today),
  };
}

/** Abono de un paciente: precio vigente, historial de precios, cuotas y pagos. */
export async function getResidentFees(tx: Transaction, residentId: string, today: string) {
  const plans = await tx
    .select({
      id: schema.residentFeePlans.id,
      amount: schema.residentFeePlans.amount,
      billingDay: schema.residentFeePlans.billingDay,
      firstDueDate: schema.residentFeePlans.firstDueDate,
      effectiveFrom: schema.residentFeePlans.effectiveFrom,
      effectiveTo: schema.residentFeePlans.effectiveTo,
      reason: schema.residentFeePlans.reason,
      createdByName: schema.users.name,
    })
    .from(schema.residentFeePlans)
    .leftJoin(schema.users, eq(schema.users.id, schema.residentFeePlans.createdBy))
    .where(eq(schema.residentFeePlans.residentId, residentId))
    .orderBy(desc(schema.residentFeePlans.createdAt));
  const charges = (
    await tx
      .select({
        id: schema.feeCharges.id,
        dueDate: schema.feeCharges.dueDate,
        periodStart: schema.feeCharges.periodStart,
        periodEnd: schema.feeCharges.periodEnd,
        amount: schema.feeCharges.amount,
        paid: paidSum,
        status: schema.feeCharges.status,
        voidReason: schema.feeCharges.voidReason,
      })
      .from(schema.feeCharges)
      .where(eq(schema.feeCharges.residentId, residentId))
      .orderBy(desc(schema.feeCharges.dueDate))
      .limit(24)
  ).map((row) => toItem(row, today));

  const receiver = aliasedTable(schema.users, "receiver");
  const payments =
    charges.length === 0
      ? []
      : await tx
          .select({
            id: schema.feePayments.id,
            chargeId: schema.feePayments.chargeId,
            amount: schema.feePayments.amount,
            paidOn: schema.feePayments.paidOn,
            notes: schema.feePayments.notes,
            methodName: schema.paymentMethods.name,
            receivedByName: receiver.name,
            voidedAt: schema.feePayments.voidedAt,
            voidReason: schema.feePayments.voidReason,
          })
          .from(schema.feePayments)
          .innerJoin(
            schema.paymentMethods,
            eq(schema.paymentMethods.id, schema.feePayments.methodId),
          )
          .innerJoin(receiver, eq(receiver.id, schema.feePayments.receivedBy))
          .where(
            inArray(
              schema.feePayments.chargeId,
              charges.map((charge) => charge.id),
            ),
          )
          .orderBy(asc(schema.feePayments.createdAt));

  const current = plans.find((plan) => plan.effectiveTo === null) ?? null;
  const next = charges
    .filter((charge) => charge.status === "pending" || charge.status === "overdue")
    .at(-1);
  return { current, plans, charges, payments, nextDue: next ?? null };
}

export interface MonthChargeItem extends ChargeItem {
  residentId: string;
  firstName: string;
  lastName: string;
  roomLabel: string | null;
}

/** Lista "Abonos" de un mes (AAAA-MM): pagadas, pendientes y vencidas. */
export async function listMonthCharges(
  tx: Transaction,
  siteId: string,
  month: string,
  today: string,
): Promise<{
  items: MonthChargeItem[];
  totals: { expected: string; collected: string; pending: string; overdue: number };
}> {
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  const from = `${month}-01`;
  const to = `${month}-${String(daysInMonth(year, monthNumber)).padStart(2, "0")}`;
  const rows = await tx
    .select({
      id: schema.feeCharges.id,
      dueDate: schema.feeCharges.dueDate,
      periodStart: schema.feeCharges.periodStart,
      periodEnd: schema.feeCharges.periodEnd,
      amount: schema.feeCharges.amount,
      paid: paidSum,
      status: schema.feeCharges.status,
      voidReason: schema.feeCharges.voidReason,
      residentId: schema.feeCharges.residentId,
      firstName: schema.residents.firstName,
      lastName: schema.residents.lastName,
      roomLabel: schema.residents.roomLabel,
    })
    .from(schema.feeCharges)
    .innerJoin(schema.residents, eq(schema.residents.id, schema.feeCharges.residentId))
    .where(
      and(
        eq(schema.feeCharges.siteId, siteId),
        between(schema.feeCharges.dueDate, from, to),
        inArray(schema.feeCharges.status, ["pending", "paid"]),
      ),
    )
    .orderBy(asc(schema.feeCharges.dueDate), asc(schema.residents.lastName));
  const items = rows.map(({ residentId, firstName, lastName, roomLabel, ...row }) => ({
    ...toItem(row, today),
    residentId,
    firstName,
    lastName,
    roomLabel,
  }));
  const sum = (values: string[]) => values.reduce((total, value) => total + toCents(value), 0n);
  return {
    items,
    totals: {
      expected: fromCents(sum(items.map((item) => item.amount))),
      collected: fromCents(sum(items.map((item) => item.paid))),
      pending: fromCents(sum(items.map((item) => item.balance))),
      overdue: items.filter((item) => item.status === "overdue").length,
    },
  };
}

/** Tarjeta del Inicio: cuotas impagas que vencen en los próximos días y las vencidas. */
export async function feeAlerts(tx: Transaction, siteId: string, today: string, days: number) {
  const [dueSoon] = await tx
    .select({ value: count() })
    .from(schema.feeCharges)
    .where(
      and(
        eq(schema.feeCharges.siteId, siteId),
        eq(schema.feeCharges.status, "pending"),
        between(schema.feeCharges.dueDate, today, addDays(today, days)),
      ),
    );
  const [overdue] = await tx
    .select({ value: count() })
    .from(schema.feeCharges)
    .where(
      and(
        eq(schema.feeCharges.siteId, siteId),
        eq(schema.feeCharges.status, "pending"),
        lt(schema.feeCharges.dueDate, today),
      ),
    );
  return { dueSoon: dueSoon?.value ?? 0, overdue: overdue?.value ?? 0 };
}
