"use client";

import type { Route } from "next";
import Link from "next/link";
import { useActionState, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { CheckboxField, Field, Select, Textarea } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-status";
import { FieldMessage, Input } from "@/components/ui/input";
import { CONSENT_LABEL } from "@/features/public-intake/privacy";
import { PUBLIC_MESSAGE_MAX_LENGTH, STEP_ONE_FIELDS } from "@/features/public-intake/schemas";
import { COVERAGE_TYPES, MODALITIES, RELATIONSHIPS } from "@/features/residents/schemas";
import type { FormState } from "@/lib/forms";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

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
 * Formulario público en 2 pasos (7.3-C3): 1) quién ingresaría y 2) quién
 * llama, con el aviso de privacidad. Los dos pasos van en el mismo
 * formulario: el paso 1 se oculta pero sus datos viajan juntos. El
 * servidor vuelve a validar todo.
 */
export function PublicRequestForm({
  action,
  hidden,
  privacyHref,
  today,
}: {
  action: Action;
  hidden: Record<string, string>;
  privacyHref: string;
  today: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, null);
  const [step, setStep] = useState<1 | 2>(1);
  const stepOne = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  // Si el servidor devuelve un error del paso 1, vuelve a ese paso (se
  // ajusta durante el render, una vez por respuesta).
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    const errors = state?.fieldErrors ?? {};
    if (STEP_ONE_FIELDS.some((field) => errors[field])) setStep(1);
  }

  const value = (key: string) => state?.values?.[key] ?? "";
  const error = (key: string) => state?.fieldErrors?.[key];
  const text = (
    name: string,
    label: string,
    options: {
      required?: boolean;
      type?: string;
      inputMode?: "numeric" | "tel" | "email";
      autoComplete?: string;
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
          required={options.required}
          autoComplete={options.autoComplete ?? "off"}
          defaultValue={value(name)}
        />
      )}
    </Field>
  );
  const select = (name: string, label: string, choices: [string, string][], required = false) => (
    <Field id={name} label={label} required={required} error={error(name)}>
      {(control) => (
        <Select {...control} name={name} required={required} defaultValue={value(name)}>
          <option value="">{required ? "Elegí una opción" : "Prefiero no decirlo"}</option>
          {choices.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
  const relationships = RELATIONSHIPS.map((item) => [item, item] as [string, string]);

  const next = () => {
    // Revisa solo los obligatorios del paso 1 antes de seguir.
    const controls = stepOne.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      "input, select",
    );
    for (const control of controls ?? []) {
      if (!control.checkValidity()) {
        control.reportValidity();
        return;
      }
    }
    setStep(2);
    requestAnimationFrame(() => heading.current?.focus());
  };

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {Object.entries(hidden).map(([name, hiddenValue]) => (
        <input key={name} type="hidden" name={name} value={hiddenValue} />
      ))}
      {/* Trampa para robots: una persona no la ve ni la completa. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="sitioWeb">Sitio web</label>
        <input id="sitioWeb" name="sitioWeb" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
        Paso {step} de 2
      </p>
      <h2 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
        {step === 1 ? "¿Quién ingresaría?" : "¿Cómo te contactamos?"}
      </h2>
      <FormMessage state={state} />

      <div ref={stepOne} hidden={step !== 1} className="flex flex-col gap-4">
        <Section title="Futuro residente" hint="Nunca pedimos diagnósticos ni medicación por acá.">
          <div className="grid gap-4 sm:grid-cols-2">
            {text("firstName", "Nombre", { required: true })}
            {text("lastName", "Apellido", { required: true })}
            {text("birthDate", "Fecha de nacimiento", { required: true, type: "date", max: today })}
            {text("nationalId", "DNI", {
              inputMode: "numeric",
              hint: "Opcional. Lo vemos con el original en la entrevista.",
            })}
            {select("admissionModality", "Modalidad", Object.entries(MODALITIES), true)}
            {select("coverageType", "Cobertura", Object.entries(COVERAGE_TYPES))}
            {text("coverageName", "Obra social o prepaga")}
            {text("coverageMemberNumber", "N.º de beneficiario o afiliado", {
              hint: "Opcional. Está en la credencial de PAMI o de la obra social.",
            })}
            {text("desiredAdmissionDate", "¿Para cuándo lo necesitan?", {
              type: "date",
              min: today,
            })}
          </div>
        </Section>
        <Button size="lg" className="self-start" onClick={next}>
          Siguiente
        </Button>
      </div>

      <div hidden={step !== 2} className="flex flex-col gap-4">
        <Section title="Tus datos" hint="Sos la persona a la que vamos a llamar.">
          <div className="grid gap-4 sm:grid-cols-2">
            {text("responsibleName", "Nombre y apellido", {
              required: step === 2,
              autoComplete: "name",
            })}
            {select("responsibleRelationship", "Vínculo", relationships)}
            {text("responsiblePhone", "Teléfono", {
              required: step === 2,
              type: "tel",
              inputMode: "tel",
              autoComplete: "tel",
            })}
            {text("responsibleEmail", "Email", {
              type: "email",
              inputMode: "email",
              autoComplete: "email",
              hint: "Opcional. Te mandamos un aviso de que la recibimos.",
            })}
          </div>
        </Section>
        <Section title="Otro familiar" hint="Opcional, por si no te encontramos.">
          <div className="grid gap-4 sm:grid-cols-3">
            {text("contact2Name", "Nombre")}
            {select("contact2Relationship", "Vínculo", relationships)}
            {text("contact2Phone", "Teléfono", { type: "tel", inputMode: "tel" })}
          </div>
        </Section>
        <Section title="Algo más">
          <Field
            id="familyMessage"
            label="¿Querés contarnos algo?"
            hint={`Opcional, hasta ${PUBLIC_MESSAGE_MAX_LENGTH} caracteres. Sin datos de salud: eso lo hablamos en persona.`}
            error={error("familyMessage")}
          >
            {(control) => (
              <Textarea
                {...control}
                name="familyMessage"
                rows={3}
                maxLength={PUBLIC_MESSAGE_MAX_LENGTH}
                defaultValue={value("familyMessage")}
              />
            )}
          </Field>
        </Section>
        <div className="flex flex-col gap-1.5">
          <Link
            href={privacyHref as Route}
            target="_blank"
            className="self-start text-sm font-medium text-primary underline underline-offset-4"
          >
            Leer el aviso de privacidad
          </Link>
          <CheckboxField
            name="consent"
            label={CONSENT_LABEL}
            defaultChecked={value("consent") === "on"}
          />
          {error("consent") ? (
            <FieldMessage tone="error" id="consent-error">
              {error("consent")}
            </FieldMessage>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="outline" size="lg" onClick={() => setStep(1)}>
            Anterior
          </Button>
          <SubmitButton size="lg" pendingLabel="Enviando…">
            Enviar solicitud
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
