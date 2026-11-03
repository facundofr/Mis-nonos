"use client";

import { useActionState } from "react";

import { Field, Select, Textarea } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-status";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";

import { recordEncounterAction, voidEncounterAction, type EncounterReturn } from "./actions";

const TEXT_MAX_LENGTH = 2000;

/**
 * Registrar una atención (6.11): especialidad, quién atendió, cuándo, dónde,
 * motivo, observaciones, indicaciones y próximo control.
 */
export function EncounterForm({
  residentId,
  back,
  specialties,
  professionals,
  defaults,
}: {
  residentId: string;
  back: EncounterReturn;
  specialties: { id: string; name: string }[];
  professionals: { id: string; name: string; specialtyName: string }[];
  defaults: { specialtyId: string; date: string; time: string };
}) {
  const [state, action] = useActionState<FormState, FormData>(
    recordEncounterAction.bind(null, residentId, back),
    null,
  );
  const values = state?.values;
  const errors = state?.fieldErrors;
  const location = values?.location ?? "in_house";

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage state={state} />
      <Field id="specialtyId" label="Especialidad" required error={errors?.specialtyId}>
        {(control) => (
          <Select
            {...control}
            name="specialtyId"
            defaultValue={values?.specialtyId ?? defaults.specialtyId}
          >
            <option value="">Elegí una especialidad</option>
            {specialties.map((specialty) => (
              <option key={specialty.id} value={specialty.id}>
                {specialty.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field
        id="professionalId"
        label="¿Quién atendió?"
        hint="Si no está en la lista, elegí “Yo” y contalo en las observaciones."
        error={errors?.professionalId}
      >
        {(control) => (
          <Select {...control} name="professionalId" defaultValue={values?.professionalId ?? ""}>
            <option value="">Yo, con mi usuario</option>
            {professionals.map((professional) => (
              <option key={professional.id} value={professional.id}>
                {professional.name} · {professional.specialtyName}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="occurredDate" label="Fecha" required error={errors?.occurredDate}>
          {(control) => (
            <Input
              {...control}
              name="occurredDate"
              type="date"
              defaultValue={values?.occurredDate ?? defaults.date}
              max={defaults.date}
            />
          )}
        </Field>
        <Field id="occurredTime" label="Hora" required error={errors?.occurredTime}>
          {(control) => (
            <Input
              {...control}
              name="occurredTime"
              type="time"
              defaultValue={values?.occurredTime ?? defaults.time}
            />
          )}
        </Field>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">
          ¿Dónde fue? <span className="text-muted-foreground">*</span>
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "in_house", label: "En la residencia" },
            { value: "external", label: "Afuera" },
          ].map((option) => (
            <label
              key={option.value}
              className="flex h-12 cursor-pointer items-center justify-center rounded-[10px] border bg-card px-2 text-center text-[15px] font-medium has-checked:border-[1.5px] has-checked:border-primary-ink has-checked:bg-secondary has-checked:text-secondary-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/30"
            >
              <input
                type="radio"
                name="location"
                value={option.value}
                defaultChecked={location === option.value}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <Field
        id="reason"
        label="Motivo"
        required
        hint="Por ejemplo: control semanal, curación, sesión de kinesiología."
        error={errors?.reason}
      >
        {(control) => (
          <Input
            {...control}
            name="reason"
            autoComplete="off"
            maxLength={200}
            defaultValue={values?.reason ?? ""}
          />
        )}
      </Field>
      <Field id="notes" label="Observaciones" hint="Qué se vio o se hizo." error={errors?.notes}>
        {(control) => (
          <Textarea
            {...control}
            name="notes"
            rows={4}
            maxLength={TEXT_MAX_LENGTH}
            defaultValue={values?.notes ?? ""}
          />
        )}
      </Field>
      <Field
        id="instructions"
        label="Indicaciones"
        hint="Lo que indicó el profesional, tal como lo dijo. La app no indica tratamientos."
        error={errors?.instructions}
      >
        {(control) => (
          <Textarea
            {...control}
            name="instructions"
            rows={3}
            maxLength={TEXT_MAX_LENGTH}
            defaultValue={values?.instructions ?? ""}
          />
        )}
      </Field>
      <Field
        id="nextControlOn"
        label="Próximo control"
        hint="Aparece en “Próximos controles” hasta que se registre otra atención de la especialidad."
        error={errors?.nextControlOn}
      >
        {(control) => (
          <Input
            {...control}
            name="nextControlOn"
            type="date"
            defaultValue={values?.nextControlOn ?? ""}
            min={defaults.date}
          />
        )}
      </Field>
      <div className="flex flex-col gap-2">
        <SubmitButton size="lg">Guardar atención</SubmitButton>
        <p className="text-center text-[13px] text-muted-foreground">
          Se registra con tu usuario, fecha y hora. No se puede editar: si hay un error, se anula.
        </p>
      </div>
    </form>
  );
}

/** Anular una atención con el motivo (5.7: no se corrige). */
export function VoidEncounterForm({ encounterId }: { encounterId: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    voidEncounterAction.bind(null, encounterId),
    null,
  );
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <FormMessage state={state} />
      <Field
        id="voidReason"
        label="¿Por qué se anula?"
        required
        hint="Por ejemplo: era de otro paciente, se cargó dos veces."
        error={state?.fieldErrors?.voidReason}
      >
        {(control) => (
          <Input
            {...control}
            name="voidReason"
            autoComplete="off"
            maxLength={200}
            defaultValue={state?.values?.voidReason ?? ""}
          />
        )}
      </Field>
      <SubmitButton variant="outline" size="md" pendingLabel="Anulando…" className="self-start">
        Anular atención
      </SubmitButton>
    </form>
  );
}
