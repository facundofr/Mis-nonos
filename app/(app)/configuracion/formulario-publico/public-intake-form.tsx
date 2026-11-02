"use client";

import { useActionState } from "react";

import { CheckboxField, Field, Textarea } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-status";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";

import { updatePublicIntakeAction } from "../actions";

export function PublicIntakeForm({
  defaults,
  baseUrl,
}: {
  defaults: { publicIntakeEnabled: boolean; publicSlug: string | null; publicIntro: string | null };
  baseUrl: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(updatePublicIntakeAction, null);
  const value = (key: "publicSlug" | "publicIntro") => state?.values?.[key] ?? defaults[key] ?? "";
  const enabled = state?.values
    ? state.values.publicIntakeEnabled === "on"
    : defaults.publicIntakeEnabled;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <Field
        id="publicSlug"
        label="Dirección"
        hint={`Queda en ${baseUrl}${value("publicSlug") || "mis-nonos"}`}
        error={state?.fieldErrors?.publicSlug}
      >
        {(control) => (
          <Input
            {...control}
            name="publicSlug"
            autoComplete="off"
            placeholder="mis-nonos"
            defaultValue={value("publicSlug")}
          />
        )}
      </Field>
      <Field
        id="publicIntro"
        label="Presentación"
        hint="Opcional. Un párrafo sobre la residencia; si queda vacío, se muestra un texto general. Sin fotos ni datos de residentes."
        error={state?.fieldErrors?.publicIntro}
      >
        {(control) => (
          <Textarea
            {...control}
            name="publicIntro"
            rows={4}
            maxLength={600}
            defaultValue={value("publicIntro")}
          />
        )}
      </Field>
      <CheckboxField
        key={String(enabled)}
        name="publicIntakeEnabled"
        label="Publicar el formulario"
        description="Apagado, la dirección no existe para nadie. Las solicitudes ya recibidas quedan en la bandeja."
        defaultChecked={enabled}
      />
      <SubmitButton className="self-start">Guardar</SubmitButton>
    </form>
  );
}
