"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage, SubmitButton } from "@/components/ui/form-status";
import type { FormState } from "@/lib/forms";

import { cancelAdmissionAction, confirmAdmissionAction } from "../../actions";

export function ConfirmAdmissionButton({
  admissionId,
  disabled,
}: {
  admissionId: string;
  disabled: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    confirmAdmissionAction.bind(null, admissionId),
    null,
  );
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
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
