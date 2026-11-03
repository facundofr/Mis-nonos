"use client";

import { useActionState } from "react";

import { CheckboxField, Field } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-status";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";

import { saveSpecialtyAction } from "./actions";

/** Agregar una especialidad, o renombrarla y activarla o desactivarla. */
export function SpecialtyForm({
  specialty,
}: {
  specialty?: { id: string; name: string; active: boolean; fixed: boolean };
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveSpecialtyAction.bind(null, specialty?.id ?? null),
    null,
  );
  const prefix = specialty?.id ?? "nueva";
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <FormMessage state={state} />
      <Field id={`${prefix}-nombre`} label="Nombre" required error={state?.fieldErrors?.name}>
        {(control) => (
          <Input
            {...control}
            name="name"
            autoComplete="off"
            maxLength={60}
            defaultValue={state?.values?.name ?? specialty?.name ?? ""}
          />
        )}
      </Field>
      {specialty && !specialty.fixed ? (
        <CheckboxField
          name="active"
          label="Activa"
          description="Si la desactivás, no se ofrece en atenciones ni profesionales nuevos; lo ya registrado no cambia."
          defaultChecked={state?.values ? state.values.active === "on" : specialty.active}
        />
      ) : null}
      {/* Enfermería siempre queda activa: la usa su sección del menú. */}
      {specialty?.fixed ? <input type="hidden" name="active" value="on" /> : null}
      <SubmitButton size="md" variant={specialty ? "outline" : "primary"} className="self-start">
        {specialty ? "Guardar" : "Agregar especialidad"}
      </SubmitButton>
    </form>
  );
}
