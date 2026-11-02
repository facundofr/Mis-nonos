"use client";

import { useActionState } from "react";

import { Field, Textarea } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-status";
import type { FormState } from "@/lib/forms";

import { confirmHandoverAction, deliverHandoverAction } from "./actions";

export function DeliverForm({
  shiftId,
  shiftDate,
  version,
  defaultNote,
  hint,
}: {
  shiftId: string;
  shiftDate: string;
  /** 0 si todavía no se entregó. */
  version: number;
  defaultNote: string;
  hint: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    deliverHandoverAction.bind(null, shiftId, shiftDate),
    null,
  );
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="version" value={version} />
      <FormMessage state={state} />
      <Field
        id="note"
        label="Nota para el turno entrante"
        hint="Lo más importante del turno. Opcional."
        error={state?.fieldErrors?.note}
      >
        {(control) => (
          <Textarea
            {...control}
            name="note"
            rows={4}
            maxLength={1000}
            defaultValue={state?.values?.note ?? defaultNote}
          />
        )}
      </Field>
      <SubmitButton size="lg" pendingLabel="Entregando…">
        {version === 0 ? "Entregar turno" : "Actualizar la entrega"}
      </SubmitButton>
      <p className="text-center text-[13px] text-muted-foreground">{hint}</p>
    </form>
  );
}

export function ConfirmForm({ shiftId, shiftDate }: { shiftId: string; shiftDate: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    confirmHandoverAction.bind(null, shiftId, shiftDate),
    null,
  );
  return (
    <form action={action} className="flex flex-col gap-2">
      <FormMessage state={state} />
      <SubmitButton size="lg" pendingLabel="Confirmando…">
        Confirmar la recepción
      </SubmitButton>
    </form>
  );
}
