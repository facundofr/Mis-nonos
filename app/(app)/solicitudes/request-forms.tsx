"use client";

import { useActionState, type ReactNode } from "react";

import { Field, Select, Textarea } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-status";
import { Input } from "@/components/ui/input";
import { CONTACT_CHANNELS, DISCARD_REASONS } from "@/db/schema/admission-requests";
import { CHANNEL_LABELS, DISCARD_LABELS } from "@/features/admission-requests/schemas";
import { COVERAGE_TYPES, MODALITIES, RELATIONSHIPS } from "@/features/residents/schemas";
import type { FormState } from "@/lib/forms";

import { changeRequestStatusAction, convertRequestAction, discardRequestAction } from "./actions";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;
export type RequestDefaults = Partial<Record<string, string | null>>;

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-[14px] border bg-card p-5">
      <legend className="float-left mb-1 text-base font-semibold">{title}</legend>
      <div className="clear-both flex flex-col gap-4">
        {hint ? <p className="-mt-2 text-sm text-muted-foreground">{hint}</p> : null}
        {children}
      </div>
    </fieldset>
  );
}

/**
 * Solicitud de ingreso cargada a mano (7.3-C3): lo mínimo para volver a
 * llamar es el nombre del futuro paciente y el nombre y teléfono del
 * responsable. Sin diagnósticos ni medicación.
 */
export function RequestForm({
  action,
  defaults = {},
  hidden,
  submitLabel,
  today,
}: {
  action: Action;
  defaults?: RequestDefaults;
  hidden: Record<string, string | number>;
  submitLabel: string;
  today: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, null);
  const value = (key: string) =>
    state?.values ? (state.values[key] ?? "") : (defaults[key] ?? "");
  const error = (key: string) => state?.fieldErrors?.[key];
  const text = (
    name: string,
    label: string,
    options: {
      required?: boolean;
      type?: string;
      inputMode?: "numeric" | "tel" | "email";
      hint?: string;
      max?: string;
      min?: string;
    } = {},
  ) => (
    <Field
      id={name}
      label={label}
      required={options.required}
      hint={options.hint}
      error={error(name)}
    >
      {(control) => (
        <Input
          {...control}
          name={name}
          type={options.type ?? "text"}
          inputMode={options.inputMode}
          max={options.max}
          min={options.min}
          autoComplete="off"
          defaultValue={value(name) ?? ""}
        />
      )}
    </Field>
  );
  const select = (name: string, label: string, choices: [string, string][], required = false) => (
    <Field id={name} label={label} required={required} error={error(name)}>
      {(control) => (
        <Select {...control} name={name} defaultValue={value(name) ?? ""}>
          <option value="">{required ? "Elegí una opción" : "Sin dato"}</option>
          {choices.map(([key, text]) => (
            <option key={key} value={key}>
              {text}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
  const relationships = RELATIONSHIPS.map((item) => [item, item] as [string, string]);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {Object.entries(hidden).map(([name, hiddenValue]) => (
        <input key={name} type="hidden" name={name} value={hiddenValue} />
      ))}
      <FormMessage state={state} />

      <Section title="Cómo llegó">
        {select(
          "contactChannel",
          "Canal",
          CONTACT_CHANNELS.map((key) => [key, CHANNEL_LABELS[key]]),
          true,
        )}
      </Section>

      <Section
        title="Futuro paciente"
        hint="Nunca se cargan diagnósticos ni medicación en una solicitud."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {text("firstName", "Nombre", { required: true })}
          {text("lastName", "Apellido", { required: true })}
          {text("nationalId", "DNI", {
            inputMode: "numeric",
            hint: "Se verifica con el original en la entrevista.",
          })}
          {text("birthDate", "Nacimiento", { type: "date", max: today })}
          {select("admissionModality", "Modalidad", Object.entries(MODALITIES))}
          {select("coverageType", "Cobertura", Object.entries(COVERAGE_TYPES))}
          {text("coverageName", "Obra social o prepaga")}
          {text("coverageMemberNumber", "N.º de beneficiario o afiliado")}
          {text("referralInstitution", "Institución que lo deriva")}
          {text("desiredAdmissionDate", "Fecha deseada de ingreso", { type: "date", min: today })}
        </div>
      </Section>

      <Section title="Responsable de la internación">
        <div className="grid gap-4 sm:grid-cols-2">
          {text("responsibleName", "Nombre y apellido", { required: true })}
          {select("responsibleRelationship", "Vínculo", relationships)}
          {text("responsiblePhone", "Teléfono", { required: true, type: "tel", inputMode: "tel" })}
          {text("responsibleEmail", "Email", { type: "email", inputMode: "email" })}
          {text("responsibleNationalId", "DNI del responsable", {
            inputMode: "numeric",
            hint: "Con DNI y domicilio queda marcado como responsable al convertir.",
          })}
          {text("responsibleAddress", "Domicilio del responsable")}
        </div>
      </Section>

      <Section title="Otros familiares" hint="Opcional. En el orden en que hay que llamarlos.">
        {([2, 3] as const).map((index) => (
          <div key={index} className="grid gap-4 sm:grid-cols-3">
            {text(`contact${index}Name`, `Familiar ${index - 1}: nombre`)}
            {select(`contact${index}Relationship`, "Vínculo", relationships)}
            {text(`contact${index}Phone`, "Teléfono", { type: "tel", inputMode: "tel" })}
          </div>
        ))}
      </Section>

      <Section title="Notas">
        <Field id="familyMessage" label="Lo que contó la familia" error={error("familyMessage")}>
          {(control) => (
            <Textarea
              {...control}
              name="familyMessage"
              rows={3}
              defaultValue={value("familyMessage") ?? ""}
            />
          )}
        </Field>
        <Field
          id="internalNotes"
          label="Notas internas"
          hint="Solo las ve el personal con acceso a la bandeja."
          error={error("internalNotes")}
        >
          {(control) => (
            <Textarea
              {...control}
              name="internalNotes"
              rows={3}
              defaultValue={value("internalNotes") ?? ""}
            />
          )}
        </Field>
      </Section>

      <SubmitButton size="lg" className="self-start">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}

export function StatusButtons({ requestId, status }: { requestId: string; status: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    changeRequestStatusAction.bind(null, requestId),
    null,
  );
  return (
    <form action={action} className="flex flex-col gap-2">
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        {status !== "contacting" ? (
          <SubmitButton variant="outline" size="md" name="status" value="contacting">
            Marcar «En contacto»
          </SubmitButton>
        ) : null}
        {status !== "waitlisted" ? (
          <SubmitButton variant="outline" size="md" name="status" value="waitlisted">
            Pasar a «En espera» (sin vacante)
          </SubmitButton>
        ) : null}
      </div>
    </form>
  );
}

export function ConvertForm({ requestId, blocked }: { requestId: string; blocked: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(
    convertRequestAction.bind(null, requestId),
    null,
  );
  return (
    <form action={action} className="flex flex-col gap-2">
      <FormMessage state={state} />
      <SubmitButton size="lg" disabled={blocked} pendingLabel="Convirtiendo…">
        Convertir en ingreso
      </SubmitButton>
      <p className="text-[13px] text-muted-foreground">
        Crea el ingreso guiado con el paciente, la cobertura y los contactos. Lo terminás en
        «Ingresos en curso».
      </p>
    </form>
  );
}

export function DiscardForm({ requestId }: { requestId: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    discardRequestAction.bind(null, requestId),
    null,
  );
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <FormMessage state={state} />
      <Field id="discardReason" label="Motivo" required error={state?.fieldErrors?.discardReason}>
        {(control) => (
          <Select
            {...control}
            name="discardReason"
            defaultValue={state?.values?.discardReason ?? ""}
          >
            <option value="">Elegí el motivo</option>
            {DISCARD_REASONS.map((key) => (
              <option key={key} value={key}>
                {DISCARD_LABELS[key]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field id="discardNotes" label="Detalle (opcional)" error={state?.fieldErrors?.discardNotes}>
        {(control) => (
          <Textarea
            {...control}
            name="discardNotes"
            rows={2}
            className="min-h-16"
            defaultValue={state?.values?.discardNotes ?? ""}
          />
        )}
      </Field>
      <SubmitButton variant="outline" size="md" className="self-start" pendingLabel="Descartando…">
        Descartar la solicitud
      </SubmitButton>
    </form>
  );
}
