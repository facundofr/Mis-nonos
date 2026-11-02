"use client";

import { useActionState } from "react";

import { PasswordInput } from "@/components/auth/password-input";
import { Field } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-status";
import { FieldMessage, Input } from "@/components/ui/input";
import { AUTH_POLICY } from "@/lib/auth/policy";
import type { FormState } from "@/lib/forms";

import { changePasswordAction, updateProfileAction } from "./actions";

export function ProfileForm({ name, phone }: { name: string; phone: string | null }) {
  const [state, action] = useActionState<FormState, FormData>(updateProfileAction, null);
  const values = state?.values;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field id="name" label="Nombre y apellido" required error={state?.fieldErrors?.name}>
        {(control) => (
          <Input {...control} name="name" autoComplete="name" defaultValue={values?.name ?? name} />
        )}
      </Field>
      <Field
        id="phone"
        label="Teléfono"
        hint="Lo ve el resto del personal en Empleados."
        error={state?.fieldErrors?.phone}
      >
        {(control) => (
          <Input
            {...control}
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            defaultValue={values?.phone ?? phone ?? ""}
          />
        )}
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="self-start">Guardar</SubmitButton>
    </form>
  );
}

/** Cambio de contraseña; `forced` = contraseña provisoria (DC-11). */
export function PasswordForm({ forced = false }: { forced?: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(changePasswordAction, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {forced ? <input type="hidden" name="forced" value="1" /> : null}
      <Field
        id="currentPassword"
        label={forced ? "Contraseña que te dieron" : "Contraseña actual"}
        required
        error={state?.fieldErrors?.currentPassword}
      >
        {(control) => (
          <PasswordInput {...control} name="currentPassword" autoComplete="current-password" />
        )}
      </Field>
      <Field id="password" label="Contraseña nueva" required error={state?.fieldErrors?.password}>
        {(control) => <PasswordInput {...control} name="password" autoComplete="new-password" />}
      </Field>
      <FieldMessage className="-mt-2">
        Al menos {AUTH_POLICY.passwordMinLength} caracteres. Una frase que recuerdes es más segura
        que una palabra con símbolos.
      </FieldMessage>
      <Field
        id="confirm"
        label="Repetí la contraseña nueva"
        required
        error={state?.fieldErrors?.confirm}
      >
        {(control) => <PasswordInput {...control} name="confirm" autoComplete="new-password" />}
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="self-start" pendingLabel="Cambiando…">
        Cambiar contraseña
      </SubmitButton>
    </form>
  );
}
