"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useActionState } from "react";

import { CheckboxField, Field, Select, Textarea } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-status";
import { Input } from "@/components/ui/input";
import { REQUIRED_FOR_LABELS } from "@/features/settings/schemas";
import type { FormState } from "@/lib/forms";

import {
  moveDocumentTypeAction,
  saveDocumentTypeAction,
  saveShiftAction,
  updateSiteAction,
} from "./actions";

export interface SiteDefaults {
  name: string;
  address: string | null;
  phone: string | null;
  timezone: string;
  emergencyServiceName: string | null;
  emergencyServicePhone: string | null;
  emergencyServiceAccount: string | null;
  medicalControlText: string | null;
  familyProvidesText: string | null;
  handoverRequiresConfirmation: boolean;
}

export function SiteForm({ defaults, timezones }: { defaults: SiteDefaults; timezones: string[] }) {
  const [state, action] = useActionState<FormState, FormData>(updateSiteAction, null);
  const value = (key: keyof SiteDefaults) =>
    state?.values?.[key] ?? (defaults[key] === null ? "" : String(defaults[key]));
  const error = (key: keyof SiteDefaults) => state?.fieldErrors?.[key];
  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-base font-semibold">Residencia</legend>
        <Field id="name" label="Nombre de la sede" required error={error("name")}>
          {(control) => <Input {...control} name="name" defaultValue={value("name")} />}
        </Field>
        <Field id="address" label="Dirección" error={error("address")}>
          {(control) => <Input {...control} name="address" defaultValue={value("address")} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="phone"
            label="Teléfono de la residencia"
            hint="Aparece en la hoja de derivación."
            error={error("phone")}
          >
            {(control) => (
              <Input {...control} name="phone" type="tel" defaultValue={value("phone")} />
            )}
          </Field>
          <Field id="timezone" label="Zona horaria" error={error("timezone")}>
            {(control) => (
              <Select {...control} name="timezone" defaultValue={value("timezone")}>
                {timezones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone.replace("America/Argentina/", "Argentina · ").replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-base font-semibold">Servicio de emergencias</legend>
        <p className="text-sm text-muted-foreground">
          Aparece primero en la ficha de emergencia de cada paciente, con su botón “Llamar”.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="emergencyServiceName"
            label="Nombre"
            hint="Por ejemplo, Medicardio."
            error={error("emergencyServiceName")}
          >
            {(control) => (
              <Input
                {...control}
                name="emergencyServiceName"
                defaultValue={value("emergencyServiceName")}
              />
            )}
          </Field>
          <Field id="emergencyServicePhone" label="Teléfono" error={error("emergencyServicePhone")}>
            {(control) => (
              <Input
                {...control}
                name="emergencyServicePhone"
                type="tel"
                defaultValue={value("emergencyServicePhone")}
              />
            )}
          </Field>
        </div>
        <Field
          id="emergencyServiceAccount"
          label="N.º de cliente"
          hint="El número de la residencia en ese servicio; se lo piden al llamar."
          error={error("emergencyServiceAccount")}
        >
          {(control) => (
            <Input
              {...control}
              name="emergencyServiceAccount"
              defaultValue={value("emergencyServiceAccount")}
            />
          )}
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-base font-semibold">Reglas de la residencia</legend>
        <p className="text-sm text-muted-foreground">Texto de referencia para el personal.</p>
        <Field
          id="medicalControlText"
          label="Control médico"
          hint="Por ejemplo, semanal."
          error={error("medicalControlText")}
        >
          {(control) => (
            <Input
              {...control}
              name="medicalControlText"
              defaultValue={value("medicalControlText")}
            />
          )}
        </Field>
        <Field
          id="familyProvidesText"
          label="Qué provee la familia"
          error={error("familyProvidesText")}
        >
          {(control) => (
            <Textarea
              {...control}
              name="familyProvidesText"
              rows={3}
              defaultValue={value("familyProvidesText")}
            />
          )}
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-base font-semibold">Turno</legend>
        <CheckboxField
          name="handoverRequiresConfirmation"
          label="El turno entrante confirma la recepción"
          description="Si está tildado, el traspaso queda pendiente hasta que alguien del turno siguiente confirme que lo recibió."
          defaultChecked={
            state?.values
              ? state.values.handoverRequiresConfirmation === "on"
              : defaults.handoverRequiresConfirmation
          }
        />
      </fieldset>

      <FormMessage state={state} />
      <SubmitButton className="self-start">Guardar</SubmitButton>
    </form>
  );
}

export function ShiftForm({
  shift,
}: {
  shift?: { id: string; name: string; startsAt: string; endsAt: string; active: boolean };
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveShiftAction.bind(null, shift?.id ?? null),
    null,
  );
  const prefix = shift?.id ?? "nuevo";
  const value = (key: "name" | "startsAt" | "endsAt") => state?.values?.[key] ?? shift?.[key] ?? "";
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem_8rem]">
        <Field id={`${prefix}-name`} label="Nombre" error={state?.fieldErrors?.name}>
          {(control) => <Input {...control} name="name" defaultValue={value("name")} />}
        </Field>
        <Field id={`${prefix}-startsAt`} label="Empieza" error={state?.fieldErrors?.startsAt}>
          {(control) => (
            <Input {...control} name="startsAt" type="time" defaultValue={value("startsAt")} />
          )}
        </Field>
        <Field id={`${prefix}-endsAt`} label="Termina" error={state?.fieldErrors?.endsAt}>
          {(control) => (
            <Input {...control} name="endsAt" type="time" defaultValue={value("endsAt")} />
          )}
        </Field>
      </div>
      <CheckboxField
        name="active"
        label="Activo"
        defaultChecked={state?.values ? state.values.active === "on" : (shift?.active ?? true)}
      />
      <FormMessage state={state} />
      <SubmitButton variant={shift ? "outline" : "primary"} size="md" className="self-start">
        {shift ? "Guardar turno" : "Agregar turno"}
      </SubmitButton>
    </form>
  );
}

export function DocumentTypeForm({
  documentType,
}: {
  documentType?: {
    id: string;
    name: string;
    description: string | null;
    requiredFor: string;
    required: boolean;
    active: boolean;
  };
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveDocumentTypeAction.bind(null, documentType?.id ?? null),
    null,
  );
  const prefix = documentType?.id ?? "nuevo";
  const values = state?.values;
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <Field id={`${prefix}-name`} label="Nombre" error={state?.fieldErrors?.name}>
        {(control) => (
          <Input {...control} name="name" defaultValue={values?.name ?? documentType?.name ?? ""} />
        )}
      </Field>
      <Field
        id={`${prefix}-description`}
        label="Aclaración"
        hint="Por ejemplo, foto del frente y del dorso."
        error={state?.fieldErrors?.description}
      >
        {(control) => (
          <Input
            {...control}
            name="description"
            defaultValue={values?.description ?? documentType?.description ?? ""}
          />
        )}
      </Field>
      <Field id={`${prefix}-requiredFor`} label="Se pide a" error={state?.fieldErrors?.requiredFor}>
        {(control) => (
          <Select
            {...control}
            name="requiredFor"
            defaultValue={values?.requiredFor ?? documentType?.requiredFor ?? "all"}
          >
            {Object.entries(REQUIRED_FOR_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <CheckboxField
        name="required"
        label="Obligatorio"
        description="Si falta, aparece como pendiente en la ficha y en el Inicio de Administración."
        defaultChecked={values ? values.required === "on" : (documentType?.required ?? true)}
      />
      <CheckboxField
        name="active"
        label="Activo"
        defaultChecked={values ? values.active === "on" : (documentType?.active ?? true)}
      />
      <FormMessage state={state} />
      <SubmitButton variant={documentType ? "outline" : "primary"} size="md" className="self-start">
        {documentType ? "Guardar" : "Agregar documento"}
      </SubmitButton>
    </form>
  );
}

/** Botones para cambiar el orden de los documentos del legajo. */
export function MoveButtons({
  itemId,
  first,
  last,
  name,
}: {
  itemId: string;
  first: boolean;
  last: boolean;
  name: string;
}) {
  const buttonClass =
    "flex size-10 items-center justify-center rounded-lg border bg-card text-muted-foreground hover:bg-muted disabled:opacity-40";
  return (
    <div className="flex gap-1">
      <form action={moveDocumentTypeAction.bind(null, itemId, "up")}>
        <button type="submit" disabled={first} aria-label={`Subir ${name}`} className={buttonClass}>
          <ArrowUp aria-hidden="true" className="size-4" />
        </button>
      </form>
      <form action={moveDocumentTypeAction.bind(null, itemId, "down")}>
        <button type="submit" disabled={last} aria-label={`Bajar ${name}`} className={buttonClass}>
          <ArrowDown aria-hidden="true" className="size-4" />
        </button>
      </form>
    </div>
  );
}
