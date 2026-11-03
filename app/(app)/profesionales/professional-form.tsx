"use client";

import { useActionState } from "react";

import { CheckboxField, Field, Select, Textarea } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-status";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";

import { saveProfessionalAction } from "./actions";

export interface ProfessionalDefaults {
  id: string;
  name: string;
  specialtyId: string;
  kind: string;
  licenseNumber: string | null;
  phone: string | null;
  institution: string | null;
  notes: string | null;
  active: boolean;
}

/** Alta o edición de un profesional: nombre, especialidad, matrícula y contacto. */
export function ProfessionalForm({
  specialties,
  professional,
}: {
  specialties: { id: string; name: string }[];
  professional?: ProfessionalDefaults;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveProfessionalAction.bind(null, professional?.id ?? null),
    null,
  );
  const values = state?.values;
  const errors = state?.fieldErrors;
  const value = (key: keyof ProfessionalDefaults & string, fallback = "") =>
    values ? (values[key] ?? "") : ((professional?.[key] as string | null) ?? fallback);
  const kind = value("kind", "external");

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage state={state} />
      <Field id="name" label="Nombre y apellido" required error={errors?.name}>
        {(control) => (
          <Input {...control} name="name" autoComplete="off" defaultValue={value("name")} />
        )}
      </Field>
      <Field id="specialtyId" label="Especialidad" required error={errors?.specialtyId}>
        {(control) => (
          <Select {...control} name="specialtyId" defaultValue={value("specialtyId")}>
            <option value="">Elegí una especialidad</option>
            {specialties.map((specialty) => (
              <option key={specialty.id} value={specialty.id}>
                {specialty.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">
          ¿Trabaja en la residencia? <span className="text-muted-foreground">*</span>
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "internal", label: "Sí, es de la residencia" },
            { value: "external", label: "No, es externo" },
          ].map((option) => (
            <label
              key={option.value}
              className="flex min-h-12 cursor-pointer items-center justify-center rounded-[10px] border bg-card px-3 text-center text-[15px] font-medium has-checked:border-[1.5px] has-checked:border-primary-ink has-checked:bg-secondary has-checked:text-secondary-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/30"
            >
              <input
                type="radio"
                name="kind"
                value={option.value}
                defaultChecked={kind === option.value}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="licenseNumber" label="Matrícula" error={errors?.licenseNumber}>
          {(control) => (
            <Input
              {...control}
              name="licenseNumber"
              autoComplete="off"
              placeholder="MN 12345"
              defaultValue={value("licenseNumber")}
            />
          )}
        </Field>
        <Field id="phone" label="Teléfono" error={errors?.phone}>
          {(control) => (
            <Input
              {...control}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              defaultValue={value("phone")}
            />
          )}
        </Field>
      </div>
      <Field
        id="institution"
        label="Institución o consultorio"
        hint="Si es externo: dónde atiende."
        error={errors?.institution}
      >
        {(control) => (
          <Input
            {...control}
            name="institution"
            autoComplete="off"
            defaultValue={value("institution")}
          />
        )}
      </Field>
      <Field
        id="notes"
        label="Notas"
        hint="Por ejemplo: qué días viene o cómo pedir un turno."
        error={errors?.notes}
      >
        {(control) => (
          <Textarea
            {...control}
            name="notes"
            rows={3}
            maxLength={500}
            defaultValue={value("notes")}
          />
        )}
      </Field>
      {professional ? (
        <CheckboxField
          name="active"
          label="Activo"
          description="Si lo desactivás, no se ofrece en atenciones nuevas; las ya registradas no cambian."
          defaultChecked={values ? values.active === "on" : professional.active}
        />
      ) : null}
      <SubmitButton size="lg">
        {professional ? "Guardar cambios" : "Agregar profesional"}
      </SubmitButton>
    </form>
  );
}
