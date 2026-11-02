import { randomUUID } from "node:crypto";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { formatMoney, fromCents, toCents } from "@/features/fees/money";
import { getResidentFees, listPaymentMethods } from "@/features/fees/queries";
import { defaultFirstDueDate } from "@/features/fees/schedule";
import { CHARGE_STATUS_LABELS, type ChargeDisplayStatus } from "@/features/fees/schemas";
import { inTenant } from "@/lib/actions";
import type { AppContext } from "@/lib/auth/session";
import { formatDateKey } from "@/lib/time/format";

import { FeeSetupForm, PaymentForm, PriceChangeForm, VoidPaymentForm } from "./fee-forms";

export const CHARGE_TONES: Record<ChargeDisplayStatus, BadgeTone> = {
  paid: "success",
  pending: "info",
  overdue: "danger",
  void: "neutral",
};

/**
 * Sección "Abono" de la ficha (7.3-C4): precio vigente, próximo
 * vencimiento, cuotas con su saldo, pagos y cambios de precio. Solo con
 * fees.read; registrar y cambiar, con fees.manage.
 */
export async function ResidentFees({
  context,
  resident,
  siteId,
  today,
  canManage,
}: {
  context: AppContext;
  resident: { id: string; status: string; admissionDate: string | null };
  siteId: string;
  today: string;
  canManage: boolean;
}) {
  const { fees, methods } = await inTenant(context, async (tx) => ({
    fees: await getResidentFees(tx, resident.id, today),
    methods: canManage ? await listPaymentMethods(tx, siteId) : [],
  }));
  const billable = ["active", "hospitalized"].includes(resident.status);

  if (!fees.current) {
    return (
      <Card>
        <CardHeader
          title="Abono"
          description="Todavía no tiene un abono. Se fija en el paso 4 del ingreso o acá."
        />
        {canManage && billable ? (
          <div className="p-5">
            <FeeSetupForm
              residentId={resident.id}
              defaultFirstDue={defaultFirstDueDate(today)}
              methods={methods}
            />
          </div>
        ) : null}
      </Card>
    );
  }

  const pendingTotal = fees.charges
    .filter((charge) => charge.status === "pending" || charge.status === "overdue")
    .reduce((total, charge) => total + toCents(charge.balance), 0n);
  const free = fees.current.amount === "0.00";

  return (
    <div className="flex flex-col gap-4">
      <Card aria-labelledby="abono-resumen">
        <CardHeader id="abono-resumen" title="Abono" />
        <dl className="grid gap-4 p-5 sm:grid-cols-3">
          <div className="flex flex-col gap-0.5">
            <dt className="text-sm text-muted-foreground">Precio vigente</dt>
            <dd className="text-xl font-semibold tabular-nums">
              {free ? "Sin cargo" : formatMoney(fees.current.amount)}
            </dd>
            <dd className="text-[13px] text-muted-foreground">
              Vence el día {fees.current.billingDay} de cada mes
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-sm text-muted-foreground">Próximo vencimiento</dt>
            <dd className="text-xl font-semibold">
              {fees.nextDue ? formatDateKey(fees.nextDue.dueDate) : "—"}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-sm text-muted-foreground">Saldo pendiente</dt>
            <dd className="text-xl font-semibold tabular-nums">
              {formatMoney(fromCents(pendingTotal))}
            </dd>
          </div>
        </dl>
      </Card>

      <Card aria-labelledby="abono-cuotas">
        <CardHeader id="abono-cuotas" title="Cuotas" description="La más nueva primero." />
        {fees.charges.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">
            {free ? "Con monto 0 no se generan cuotas." : "Todavía no hay cuotas."}
          </p>
        ) : (
          <ul className="divide-y">
            {fees.charges.map((charge) => {
              const payments = fees.payments.filter((payment) => payment.chargeId === charge.id);
              const open = charge.status === "pending" || charge.status === "overdue";
              return (
                <li key={charge.id} className="flex flex-col gap-2 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">Vence {formatDateKey(charge.dueDate)}</span>
                      <Badge tone={CHARGE_TONES[charge.status]}>
                        {CHARGE_STATUS_LABELS[charge.status]}
                      </Badge>
                    </span>
                    <span className="text-[15px] tabular-nums">
                      {formatMoney(charge.amount)}
                      {open && charge.balance !== charge.amount ? (
                        <span className="text-muted-foreground">
                          {" "}
                          · saldo {formatMoney(charge.balance)}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <span className="text-[13px] text-muted-foreground">
                    Período {formatDateKey(charge.periodStart)} al {formatDateKey(charge.periodEnd)}
                    {charge.voidReason ? ` · ${charge.voidReason}` : ""}
                  </span>
                  {payments.length > 0 ? (
                    <ul className="flex flex-col gap-1.5 rounded-lg bg-muted/50 px-3 py-2">
                      {payments.map((payment) => (
                        <li key={payment.id} className="flex flex-col gap-1 text-sm">
                          <span
                            className={payment.voidedAt ? "text-muted-foreground line-through" : ""}
                          >
                            {formatMoney(payment.amount)} · {payment.methodName} ·{" "}
                            {formatDateKey(payment.paidOn)} · {payment.receivedByName}
                            {payment.notes ? ` · ${payment.notes}` : ""}
                          </span>
                          {payment.voidedAt ? (
                            <span className="text-[13px] text-muted-foreground">
                              Anulado: {payment.voidReason}
                            </span>
                          ) : canManage ? (
                            <details>
                              <summary className="w-fit cursor-pointer text-[13px] text-muted-foreground underline-offset-4 hover:underline">
                                Anular este pago
                              </summary>
                              <div className="pt-2">
                                <VoidPaymentForm paymentId={payment.id} />
                              </div>
                            </details>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {open && canManage ? (
                    <details className="group">
                      <summary className="w-fit cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted">
                        Registrar pago
                      </summary>
                      <div className="pt-3">
                        <PaymentForm
                          chargeId={charge.id}
                          balance={charge.balance}
                          methods={methods}
                          today={today}
                          clientRequestId={randomUUID()}
                        />
                      </div>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card aria-labelledby="abono-precio">
        <CardHeader
          id="abono-precio"
          title="Precio"
          description="Cambiarlo guarda el anterior y rige desde la próxima cuota sin pagos."
        />
        <div className="flex flex-col gap-4 p-5">
          {canManage && billable ? <PriceChangeForm residentId={resident.id} /> : null}
          <ol className="flex flex-col gap-1.5 text-sm">
            {fees.plans.map((plan) => (
              <li key={plan.id}>
                <b className="tabular-nums">
                  {plan.amount === "0.00" ? "Sin cargo" : formatMoney(plan.amount)}
                </b>{" "}
                desde el {formatDateKey(plan.effectiveFrom)}
                {plan.effectiveTo ? ` hasta el ${formatDateKey(plan.effectiveTo)}` : " (vigente)"}
                <span className="text-muted-foreground">
                  {plan.reason ? ` · ${plan.reason}` : ""}
                  {plan.createdByName ? ` · ${plan.createdByName}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </Card>
    </div>
  );
}
