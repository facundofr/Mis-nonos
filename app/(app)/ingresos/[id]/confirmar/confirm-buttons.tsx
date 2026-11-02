"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage, SubmitButton } from "@/components/ui/form-status";
import type { FormState } from "@/lib/forms";

import { FeeSetupFields, type MethodOption } from "../../../abonos/fee-forms";
import { cancelAdmissionAction, confirmAdmissionAction } from "../../actions";

export function ConfirmAdmissionButton({
  admissionId,
  disabled,
  fee,
}: {
  admissionId: string;
  disabled: boolean;
  /** Con el módulo del abono: abono y próximo vencimiento (7.3-C4). */
  fee?: { defaultFirstDue: string; minDue: string; methods: MethodOption[] };
}) {
  const [state, action] = useActionState<FormState, FormData>(
    confirmAdmissionAction.bind(null, admissionId),
    null,
  );
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      {fee ? (
        <fieldset className="flex flex-col gap-4 rounded-[14px] border bg-card p-5">
          <legend className="float-left mb-1 text-base font-semibold">Abono mensual</legend>
          <div className="clear-both">
            <FeeSetupFields
              state={state}
              defaultFirstDue={fee.defaultFirstDue}
              minDue={fee.minDue}
              methods={fee.methods}
            />
          </div>
        </fieldset>
      ) : null}
      <FormMessage state={state} />
      <SubmitButton disabled={disabled} pendingLabel="Confirmando…">
        Confirmar ingreso
      </SubmitButton>
    </form>
  );
}

export function CancelAdmissionButton({ admissionId }: { admissionId: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    cancelAdmissionAction.bind(null, admissionId),
    null,
  );
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <Button variant="ghost" className="text-destructive" onClick={() => setConfirming(true)}>
        Cancelar este ingreso
      </Button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3 rounded-[14px] border bg-card p-4">
      <p className="text-sm">
        El ingreso queda cancelado: no se borra, pero deja de aparecer en Ingresos en curso.
      </p>
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton variant="destructive" pendingLabel="Cancelando…">
          Sí, cancelar el ingreso
        </SubmitButton>
        <Button variant="ghost" onClick={() => setConfirming(false)}>
          Volver
        </Button>
      </div>
    </form>
  );
}
