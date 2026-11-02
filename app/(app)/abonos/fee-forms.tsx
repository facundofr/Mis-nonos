"use client";

import { useActionState, useState } from "react";

import { CheckboxField, Field, Select } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-status";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";

import {
  changePriceAction,
  registerPaymentAction,
  savePaymentMethodAction,
  setupFeeAction,
  voidPaymentAction,
} from "./actions";

export interface MethodOption {
  id: string;
  name: string;
}

/**
 * Abono, próximo vencimiento y primer mes cobrado (7.3-C4). Se usa en el
 * paso 4 del ingreso y en la ficha de pacientes que todavía no tienen.
 */
export function FeeSetupFields({
  state,
  defaultFirstDue,
  methods,
  minDue,
}: {
  state: FormState;
  defaultFirstDue: string;
  methods: MethodOption[];
  minDue?: string;
}) {
  const values = state?.values;
  const [paid, setPaid] = useState(values ? values.firstMonthPaid === "on" : true);
  const error = (key: string) => state?.fieldErrors?.[key];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="feeAmount"
          label="Abono mensual (en pesos)"
          required
          hint="Por ejemplo, 450.000. Si no paga (PAMI cubre todo), 0."
          error={error("feeAmount")}
        >
          {(control) => (
            <Input
              {...control}
              name="feeAmount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="450.000"
              defaultValue={values?.feeAmount ?? ""}
            />
          )}
        </Field>
        <Field
          id="firstDueDate"
          label="Próximo vencimiento"
          required
          hint="Por defecto, el mismo día del mes siguiente al ingreso."
          error={error("firstDueDate")}
        >
          {(control) => (
            <Input
              {...control}
              name="firstDueDate"
              type="date"
              min={minDue}
              defaultValue={values?.firstDueDate ?? defaultFirstDue}
            />
          )}
        </Field>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card px-3.5 py-3">
        <input
          type="checkbox"
          name="firstMonthPaid"
          checked={paid}
          onChange={(event) => setPaid(event.target.checked)}
          className="mt-0.5 size-[18px] shrink-0 accent-primary"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-medium">Primer mes cobrado al ingreso</span>
          <span className="text-[13px] text-muted-foreground">
            Queda registrado el pago del primer mes (mes adelantado).
          </span>
        </span>
      </label>
      {paid ? (
        <Field
          id="firstPaymentMethodId"
          label="¿Cómo se pagó?"
          required
          error={error("firstPaymentMethodId")}
        >
          {(control) => (
            <Select
              {...control}
              name="firstPaymentMethodId"
              defaultValue={values?.firstPaymentMethodId ?? methods[0]?.id ?? ""}
            >
              {methods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      ) : null}
    </div>
  );
}

export function FeeSetupForm({
  residentId,
  defaultFirstDue,
  methods,
}: {
  residentId: string;
  defaultFirstDue: string;
  methods: MethodOption[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    setupFeeAction.bind(null, residentId),
    null,
  );
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <FeeSetupFields state={state} defaultFirstDue={defaultFirstDue} methods={methods} />
      <SubmitButton className="self-start">Guardar abono</SubmitButton>
    </form>
  );
}

export function PaymentForm({
  chargeId,
  balance,
  methods,
  today,
  clientRequestId,
}: {
  chargeId: string;
  balance: string;
  methods: MethodOption[];
  today: string;
  clientRequestId: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    registerPaymentAction.bind(null, chargeId),
    null,
  );
  const prefix = `pago-${chargeId}`;
  if (state?.success) {
    return (
      <p role="status" className="text-sm font-medium text-success-foreground">
        {state.success}
      </p>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="clientRequestId" value={clientRequestId} />
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id={`${prefix}-monto`} label="Monto" required error={state?.fieldErrors?.amount}>
          {(control) => (
            <Input
              {...control}
              name="amount"
              inputMode="decimal"
              defaultValue={state?.values?.amount ?? balance.replace(".", ",")}
            />
          )}
        </Field>
        <Field id={`${prefix}-fecha`} label="Fecha" required error={state?.fieldErrors?.paidOn}>
          {(control) => (
            <Input
              {...control}
              name="paidOn"
              type="date"
              max={today}
              defaultValue={state?.values?.paidOn ?? today}
            />
          )}
        </Field>
        <Field id={`${prefix}-medio`} label="Medio" required error={state?.fieldErrors?.methodId}>
          {(control) => (
            <Select
              {...control}
              name="methodId"
              defaultValue={state?.values?.methodId ?? methods[0]?.id ?? ""}
            >
              {methods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <Field id={`${prefix}-nota`} label="Nota (opcional)" error={state?.fieldErrors?.notes}>
        {(control) => <Input {...control} name="notes" defaultValue={state?.values?.notes ?? ""} />}
      </Field>
      <SubmitButton size="md" className="self-start" pendingLabel="Registrando…">
        Registrar pago
      </SubmitButton>
    </form>
  );
}

export function VoidPaymentForm({ paymentId }: { paymentId: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    voidPaymentAction.bind(null, paymentId),
    null,
  );
  return (
    <form action={action} className="flex flex-col gap-2" noValidate>
      <FormMessage state={state} />
      <Field id={`anular-${paymentId}`} label="Motivo" required error={state?.fieldErrors?.reason}>
        {(control) => <Input {...control} name="reason" placeholder="Se cargó dos veces" />}
      </Field>
      <SubmitButton variant="outline" size="md" className="self-start" pendingLabel="Anulando…">
        Anular el pago
      </SubmitButton>
    </form>
  );
}

export function PriceChangeForm({ residentId }: { residentId: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    changePriceAction.bind(null, residentId),
    null,
  );
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="nuevo-precio" label="Precio nuevo" required error={state?.fieldErrors?.amount}>
          {(control) => (
            <Input
              {...control}
              name="amount"
              inputMode="decimal"
              defaultValue={state?.values?.amount ?? ""}
            />
          )}
        </Field>
        <Field id="motivo-precio" label="Motivo" required error={state?.fieldErrors?.reason}>
          {(control) => (
            <Input
              {...control}
              name="reason"
              placeholder="Aumento anual"
              defaultValue={state?.values?.reason ?? ""}
            />
          )}
        </Field>
      </div>
      <SubmitButton variant="outline" size="md" className="self-start">
        Cambiar precio
      </SubmitButton>
    </form>
  );
}

export function PaymentMethodForm({
  method,
}: {
  method?: { id: string; name: string; active: boolean };
}) {
  const [state, action] = useActionState<FormState, FormData>(
    savePaymentMethodAction.bind(null, method?.id ?? null),
    null,
  );
  const prefix = method?.id ?? "nuevo";
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <FormMessage state={state} />
      <Field id={`${prefix}-nombre`} label="Nombre" required error={state?.fieldErrors?.name}>
        {(control) => (
          <Input
            {...control}
            name="name"
            defaultValue={state?.values?.name ?? method?.name ?? ""}
          />
        )}
      </Field>
      {method ? (
        <CheckboxField
          name="active"
          label="Activo"
          description="Si lo desactivás, no se ofrece para pagos nuevos; los ya registrados no cambian."
          defaultChecked={state?.values ? state.values.active === "on" : method.active}
        />
      ) : null}
      <SubmitButton size="md" variant={method ? "outline" : "primary"} className="self-start">
        {method ? "Guardar" : "Agregar medio de pago"}
      </SubmitButton>
    </form>
  );
}
