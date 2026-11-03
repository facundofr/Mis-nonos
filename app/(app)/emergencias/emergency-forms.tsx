"use client";

import { useActionState } from "react";

import { CheckboxField, Field, Textarea } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-status";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";

import { closeEmergencyAction, recordEmergencyAction } from "./actions";

const TEXT_MAX_LENGTH = 2000;

/** A quién se llamó y si hubo traslado: lo comparten el registro y el cierre. */
function CallsAndTransfer({
  state,
  defaults,
}: {
  state: FormState;
  defaults?: { calls: string | null; transferred: boolean; transferDestination: string | null };
}) {
  const values = state?.values;
  const errors = state?.fieldErrors;
  return (
    <>
      <Field
        id="calls"
        label="¿A quién se llamó?"
        hint="Servicio de emergencias, familia, médico de cabecera, Dirección…"
        error={errors?.calls}
      >
        {(control) => (
          <Textarea
            {...control}
            name="calls"
            rows={2}
            maxLength={TEXT_MAX_LENGTH}
            defaultValue={values?.calls ?? defaults?.calls ?? ""}
          />
        )}
      </Field>
      <CheckboxField
        name="transferred"
        label="Hubo traslado"
        description="Si lo llevaron a una guardia o a un hospital."
        defaultChecked={values ? values.transferred === "on" : (defaults?.transferred ?? false)}
      />
      <Field
        id="transferDestination"
        label="¿Adónde lo trasladaron?"
        hint="Solo si hubo traslado."
        error={errors?.transferDestination}
      >
        {(control) => (
          <Input
            {...control}
            name="transferDestination"
            autoComplete="off"
            maxLength={200}
            defaultValue={values?.transferDestination ?? defaults?.transferDestination ?? ""}
          />
        )}
      </Field>
    </>
  );
}

/** Registrar una emergencia (6.9, paso 5): cuándo empezó, qué pasó, llamadas y traslado. */
export function EmergencyForm({
  residentId,
  defaults,
}: {
  residentId: string;
  defaults: { date: string; time: string };
}) {
  const [state, action] = useActionState<FormState, FormData>(
    recordEmergencyAction.bind(null, residentId),
    null,
  );
  const values = state?.values;
  const errors = state?.fieldErrors;
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage state={state} />
      <div className="grid grid-cols-2 gap-3">
        <Field id="startedDate" label="Fecha" required error={errors?.startedDate}>
          {(control) => (
            <Input
              {...control}
              name="startedDate"
              type="date"
              defaultValue={values?.startedDate ?? defaults.date}
              max={defaults.date}
            />
          )}
        </Field>
        <Field id="startedTime" label="Hora de inicio" required error={errors?.startedTime}>
          {(control) => (
            <Input
              {...control}
              name="startedTime"
              type="time"
              defaultValue={values?.startedTime ?? defaults.time}
            />
          )}
        </Field>
      </div>
      <Field id="description" label="¿Qué pasó?" required error={errors?.description}>
        {(control) => (
          <Textarea
            {...control}
            name="description"
            rows={4}
            maxLength={TEXT_MAX_LENGTH}
            defaultValue={values?.description ?? ""}
          />
        )}
      </Field>
      <CallsAndTransfer state={state} />
      <div className="flex flex-col gap-2">
        <SubmitButton size="lg">Registrar emergencia</SubmitButton>
        <p className="text-center text-[13px] text-muted-foreground">
          Queda abierta hasta que alguien la cierre con el resultado.
        </p>
      </div>
    </form>
  );
}

/** Cerrar una emergencia: completar llamadas y traslado y contar cómo terminó. */
export function CloseEmergencyForm({
  emergencyId,
  defaults,
}: {
  emergencyId: string;
  defaults: { calls: string | null; transferred: boolean; transferDestination: string | null };
}) {
  const [state, action] = useActionState<FormState, FormData>(
    closeEmergencyAction.bind(null, emergencyId),
    null,
  );
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage state={state} />
      <CallsAndTransfer state={state} defaults={defaults} />
      <Field
        id="outcome"
        label="¿Cómo terminó?"
        required
        hint="Por ejemplo: quedó internado, volvió a la residencia, se resolvió sin traslado."
        error={state?.fieldErrors?.outcome}
      >
        {(control) => (
          <Textarea
            {...control}
            name="outcome"
            rows={3}
            maxLength={TEXT_MAX_LENGTH}
            defaultValue={state?.values?.outcome ?? ""}
          />
        )}
      </Field>
      <SubmitButton size="lg">Cerrar emergencia</SubmitButton>
    </form>
  );
}
