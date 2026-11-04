"use client";

import { X } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { CheckboxField, Field, Select, Textarea } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-status";
import { Input } from "@/components/ui/input";
import {
  COVERAGE_TYPES,
  DISCHARGE_REASONS,
  MODALITIES,
  RELATIONSHIPS,
} from "@/features/residents/schemas";
import type { FormState } from "@/lib/forms";

import {
  addAllergyAction,
  discardAllergyAction,
  dischargeAction,
  hospitalizeAction,
  removeContactAction,
  returnFromHospitalAction,
  type ContactReturn,
} from "./actions";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export interface ResidentDefaults {
  firstName: string;
  lastName: string;
  nationalId: string | null;
  birthDate: string | null;
  birthPlace: string | null;
  previousAddress: string | null;
  roomLabel: string | null;
  admissionDate: string | null;
  referralInstitution: string | null;
  admissionModality: string;
  coverageType: string;
  coverageName: string | null;
  coverageMemberNumber: string | null;
  coveragePlan: string | null;
  primaryPhysicianName: string | null;
  primaryPhysicianPhone: string | null;
  specialInstructions: string | null;
  nationalIdInCustody: boolean;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-[14px] border bg-card p-5">
      <legend className="float-left mb-1 text-base font-semibold">{title}</legend>
      <div className="clear-both flex flex-col gap-4">{children}</div>
    </fieldset>
  );
}

/**
 * Datos del paciente: paso 1 del ingreso y "Editar paciente" (DC-13). Nombre
 * y apellido van separados (F.7).
 */
export function ResidentDataForm({
  action,
  defaults,
  version,
  submitLabel,
  today,
}: {
  action: Action;
  defaults?: ResidentDefaults;
  version?: number;
  submitLabel: string;
  today: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, null);
  const [modality, setModality] = useState(defaults?.admissionModality ?? "pami");
  const value = (key: keyof ResidentDefaults) => {
    if (state?.values && key in state.values) return state.values[key];
    const current = defaults?.[key];
    return current === null || current === undefined || typeof current === "boolean" ? "" : current;
  };
  const error = (key: string) => state?.fieldErrors?.[key];

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {version !== undefined ? <input type="hidden" name="version" value={version} /> : null}

      <Section title="Paciente">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="firstName" label="Nombre" required error={error("firstName")}>
            {(control) => (
              <Input
                {...control}
                name="firstName"
                autoComplete="off"
                defaultValue={value("firstName")}
              />
            )}
          </Field>
          <Field id="lastName" label="Apellido" required error={error("lastName")}>
            {(control) => (
              <Input
                {...control}
                name="lastName"
                autoComplete="off"
                defaultValue={value("lastName")}
              />
            )}
          </Field>
          <Field id="nationalId" label="DNI" error={error("nationalId")}>
            {(control) => (
              <Input
                {...control}
                name="nationalId"
                inputMode="numeric"
                defaultValue={value("nationalId")}
              />
            )}
          </Field>
          <Field id="birthDate" label="Nacimiento" error={error("birthDate")}>
            {(control) => (
              <Input
                {...control}
                name="birthDate"
                type="date"
                max={today}
                defaultValue={value("birthDate")}
              />
            )}
          </Field>
        </div>
        <Field id="birthPlace" label="Lugar de nacimiento" error={error("birthPlace")}>
          {(control) => <Input {...control} name="birthPlace" defaultValue={value("birthPlace")} />}
        </Field>
        <Field id="previousAddress" label="Domicilio anterior" error={error("previousAddress")}>
          {(control) => (
            <Input {...control} name="previousAddress" defaultValue={value("previousAddress")} />
          )}
        </Field>
      </Section>

      <Section title="Ingreso">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="admissionDate"
            label="Fecha de ingreso"
            required
            error={error("admissionDate")}
          >
            {(control) => (
              <Input
                {...control}
                name="admissionDate"
                type="date"
                defaultValue={value("admissionDate") || today}
              />
            )}
          </Field>
          <Field id="roomLabel" label="Habitación" error={error("roomLabel")}>
            {(control) => <Input {...control} name="roomLabel" defaultValue={value("roomLabel")} />}
          </Field>
        </div>
        <Field
          id="referralInstitution"
          label="Institución que lo deriva"
          error={error("referralInstitution")}
        >
          {(control) => (
            <Input
              {...control}
              name="referralInstitution"
              defaultValue={value("referralInstitution")}
            />
          )}
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium">Modalidad *</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(MODALITIES).map(([key, label]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-3 rounded-xl border bg-card px-3.5 py-3 has-[:checked]:border-primary-ink has-[:checked]:bg-secondary"
              >
                <input
                  type="radio"
                  name="admissionModality"
                  value={key}
                  checked={modality === key}
                  onChange={() => setModality(key)}
                  className="size-[18px] accent-primary-ink"
                />
                <span className="text-[15px] font-medium">{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </Section>

      <Section title="Cobertura">
        <Field id="coverageType" label="Cobertura" error={error("coverageType")}>
          {(control) => (
            <Select
              {...control}
              name="coverageType"
              key={modality}
              defaultValue={modality === "pami" ? "pami" : value("coverageType") || "obra_social"}
            >
              {Object.entries(COVERAGE_TYPES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {modality === "private" ? (
          <Field id="coverageName" label="Obra social o prepaga" error={error("coverageName")}>
            {(control) => (
              <Input {...control} name="coverageName" defaultValue={value("coverageName")} />
            )}
          </Field>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="coverageMemberNumber"
            label={modality === "pami" ? "N.º de beneficiario PAMI" : "N.º de afiliado"}
            error={error("coverageMemberNumber")}
          >
            {(control) => (
              <Input
                {...control}
                name="coverageMemberNumber"
                defaultValue={value("coverageMemberNumber")}
              />
            )}
          </Field>
          <Field id="coveragePlan" label="Plan" error={error("coveragePlan")}>
            {(control) => (
              <Input {...control} name="coveragePlan" defaultValue={value("coveragePlan")} />
            )}
          </Field>
        </div>
        <CheckboxField
          name="nationalIdInCustody"
          label="DNI original en custodia de la residencia"
          defaultChecked={
            state?.values
              ? state.values.nationalIdInCustody === "on"
              : (defaults?.nationalIdInCustody ?? false)
          }
        />
      </Section>

      <Section title="Cuidados">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="primaryPhysicianName"
            label="Médico de cabecera"
            error={error("primaryPhysicianName")}
          >
            {(control) => (
              <Input
                {...control}
                name="primaryPhysicianName"
                defaultValue={value("primaryPhysicianName")}
              />
            )}
          </Field>
          <Field
            id="primaryPhysicianPhone"
            label="Teléfono del médico"
            error={error("primaryPhysicianPhone")}
          >
            {(control) => (
              <Input
                {...control}
                name="primaryPhysicianPhone"
                type="tel"
                defaultValue={value("primaryPhysicianPhone")}
              />
            )}
          </Field>
        </div>
        <Field
          id="specialInstructions"
          label="Indicaciones especiales"
          hint="Por ejemplo, dieta de textura blanda o directivas anticipadas documentadas."
          error={error("specialInstructions")}
        >
          {(control) => (
            <Textarea
              {...control}
              name="specialInstructions"
              rows={3}
              defaultValue={value("specialInstructions")}
            />
          )}
        </Field>
      </Section>

      <FormMessage state={state} />
      <SubmitButton className="self-stretch sm:self-start">{submitLabel}</SubmitButton>
    </form>
  );
}

export interface ContactDefaults {
  name: string;
  relationship: string | null;
  nationalId: string | null;
  address: string | null;
  phonePrimary: string | null;
  phoneMobile: string | null;
  phoneWork: string | null;
  whatsapp: boolean;
  email: string | null;
  emergencyPriority: number | null;
  isAdmissionResponsible: boolean;
  isLegalRepresentative: boolean;
  canReceiveInfo: boolean;
  canPickUp: boolean;
  availabilityNotes: string | null;
}

/** Contacto (diseño ContactoForm, con los campos de la v2.2 de F.7). */
export function ContactForm({
  action,
  defaults,
  otherContacts,
  responsibleByDefault,
}: {
  action: Action;
  defaults?: ContactDefaults;
  /** Los demás contactos, para elegir el orden en emergencias. */
  otherContacts: { name: string; emergencyPriority: number | null }[];
  responsibleByDefault?: boolean;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, null);
  const values = state?.values;
  const [responsible, setResponsible] = useState(
    values
      ? values.isAdmissionResponsible === "on"
      : (defaults?.isAdmissionResponsible ?? responsibleByDefault ?? false),
  );
  const text = (key: keyof ContactDefaults) => {
    if (values && key in values) return values[key];
    const current = defaults?.[key];
    return current === null || current === undefined || typeof current === "boolean"
      ? ""
      : String(current);
  };
  const checked = (key: keyof ContactDefaults, fallback: boolean) =>
    values ? values[key] === "on" : ((defaults?.[key] as boolean | undefined) ?? fallback);
  const error = (key: string) => state?.fieldErrors?.[key];
  const usedPriorities = otherContacts
    .map((contact) => contact.emergencyPriority)
    .filter((priority): priority is number => priority !== null);
  const nextPriority = usedPriorities.length > 0 ? Math.max(...usedPriorities) + 1 : 1;
  const priorityOptions = Array.from(
    { length: Math.max(nextPriority, otherContacts.length + 1) },
    (_, index) => index + 1,
  );
  const defaultPriority = defaults
    ? defaults.emergencyPriority === null
      ? ""
      : String(defaults.emergencyPriority)
    : String(responsibleByDefault ? 1 : nextPriority);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <Field id="name" label="Nombre y apellido" required error={error("name")}>
        {(control) => (
          <Input {...control} name="name" autoComplete="off" defaultValue={text("name")} />
        )}
      </Field>
      <Field id="relationship" label="Vínculo" error={error("relationship")}>
        {(control) => (
          <Select {...control} name="relationship" defaultValue={text("relationship")}>
            <option value="">Sin indicar</option>
            {RELATIONSHIPS.map((relationship) => (
              <option key={relationship} value={relationship}>
                {relationship}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card px-3.5 py-3">
        <input
          type="checkbox"
          name="isAdmissionResponsible"
          checked={responsible}
          onChange={(event) => setResponsible(event.target.checked)}
          className="mt-0.5 size-[18px] shrink-0 accent-primary-ink"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-medium">Responsable de la internación</span>
          <span className="text-[13px] leading-snug text-muted-foreground">
            Quien firma la ficha de ingreso y los formularios de PAMI. Hay uno por paciente: si
            marcás a otro, deja de serlo el anterior.
          </span>
        </span>
      </label>
      {responsible ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="nationalId" label="DNI del responsable" required error={error("nationalId")}>
            {(control) => (
              <Input
                {...control}
                name="nationalId"
                inputMode="numeric"
                defaultValue={text("nationalId")}
              />
            )}
          </Field>
          <Field id="address" label="Domicilio del responsable" required error={error("address")}>
            {(control) => <Input {...control} name="address" defaultValue={text("address")} />}
          </Field>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="phoneMobile" label="Celular" error={error("phoneMobile")}>
          {(control) => (
            <Input {...control} name="phoneMobile" type="tel" defaultValue={text("phoneMobile")} />
          )}
        </Field>
        <Field id="phonePrimary" label="Teléfono" error={error("phonePrimary")}>
          {(control) => (
            <Input
              {...control}
              name="phonePrimary"
              type="tel"
              defaultValue={text("phonePrimary")}
            />
          )}
        </Field>
        <Field id="phoneWork" label="Laboral" error={error("phoneWork")}>
          {(control) => (
            <Input {...control} name="phoneWork" type="tel" defaultValue={text("phoneWork")} />
          )}
        </Field>
      </div>
      <CheckboxField
        name="whatsapp"
        label="Tiene WhatsApp en el celular"
        defaultChecked={checked("whatsapp", false)}
      />
      <Field id="email" label="Email" error={error("email")}>
        {(control) => (
          <Input
            {...control}
            name="email"
            type="email"
            autoCapitalize="none"
            defaultValue={text("email")}
          />
        )}
      </Field>
      <Field
        id="emergencyPriority"
        label="Orden para emergencias"
        error={error("emergencyPriority")}
      >
        {(control) => (
          <Select
            {...control}
            name="emergencyPriority"
            defaultValue={values?.emergencyPriority ?? defaultPriority}
          >
            {priorityOptions.map((priority) => {
              const taken = otherContacts.find((contact) => contact.emergencyPriority === priority);
              return (
                <option key={priority} value={priority}>
                  {priority}.º
                  {taken ? ` (hoy: ${taken.name})` : priority === 1 ? " — llamar primero" : ""}
                </option>
              );
            })}
            <option value="">No es contacto de emergencia</option>
          </Select>
        )}
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">Autorizaciones</legend>
        <CheckboxField
          name="canReceiveInfo"
          label="Recibe información sobre el paciente"
          defaultChecked={checked("canReceiveInfo", true)}
        />
        <CheckboxField
          name="canPickUp"
          label="Puede retirarlo/a de la residencia"
          defaultChecked={checked("canPickUp", false)}
        />
        <CheckboxField
          name="isLegalRepresentative"
          label="Referente legal"
          description="Apoderado o representante legal. Puede ser o no el responsable."
          defaultChecked={checked("isLegalRepresentative", false)}
        />
      </fieldset>
      <Field
        id="availabilityNotes"
        label="Observaciones"
        hint="Por ejemplo: no llamar antes de las 8."
        error={error("availabilityNotes")}
      >
        {(control) => (
          <Input {...control} name="availabilityNotes" defaultValue={text("availabilityNotes")} />
        )}
      </Field>
      <CheckboxField
        name="verified"
        label="Verifiqué estos datos hoy con la familia"
        defaultChecked={!defaults}
      />

      <FormMessage state={state} />
      <SubmitButton className="self-stretch sm:self-start">Guardar contacto</SubmitButton>
    </form>
  );
}

export function RemoveContactButton({
  residentId,
  contactId,
  back,
  name,
}: {
  residentId: string;
  contactId: string;
  back: ContactReturn;
  name: string;
}) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <Button
        variant="ghost"
        size="md"
        className="text-destructive"
        onClick={() => setConfirming(true)}
      >
        Quitar contacto
      </Button>
    );
  }
  return (
    <form
      action={removeContactAction.bind(null, residentId, contactId, back)}
      className="flex flex-wrap items-center gap-2"
    >
      <span className="text-sm">¿Quitar a {name}? Queda en el historial.</span>
      <SubmitButton variant="destructive" size="md" pendingLabel="Quitando…">
        Sí, quitar
      </SubmitButton>
      <Button variant="ghost" size="md" onClick={() => setConfirming(false)}>
        Cancelar
      </Button>
    </form>
  );
}

export function AllergyForm({ residentId }: { residentId: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    addAllergyAction.bind(null, residentId),
    null,
  );
  return (
    <form action={action} className="flex flex-col gap-3" noValidate key={state?.success}>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_10rem]">
        <Field id="substance" label="Alergia a" error={state?.fieldErrors?.substance}>
          {(control) => (
            <Input
              {...control}
              name="substance"
              placeholder="Por ejemplo, penicilina"
              defaultValue={state?.error ? state.values?.substance : ""}
            />
          )}
        </Field>
        <Field id="reaction" label="Reacción" error={state?.fieldErrors?.reaction}>
          {(control) => (
            <Input
              {...control}
              name="reaction"
              placeholder="Por ejemplo, ronchas"
              defaultValue={state?.error ? state.values?.reaction : ""}
            />
          )}
        </Field>
        <Field id="severity" label="Gravedad" error={state?.fieldErrors?.severity}>
          {(control) => (
            <Input
              {...control}
              name="severity"
              placeholder="Leve, grave…"
              defaultValue={state?.error ? state.values?.severity : ""}
            />
          )}
        </Field>
      </div>
      <FormMessage state={state} />
      <SubmitButton variant="outline" size="md" className="self-start">
        Agregar alergia
      </SubmitButton>
    </form>
  );
}

export function DiscardAllergyButton({
  residentId,
  allergyId,
  substance,
}: {
  residentId: string;
  allergyId: string;
  substance: string;
}) {
  return (
    <form action={discardAllergyAction.bind(null, residentId, allergyId)}>
      <button
        type="submit"
        aria-label={`Descartar la alergia a ${substance} (cargada por error)`}
        className="flex size-8 items-center justify-center rounded-full text-current hover:bg-black/10"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </form>
  );
}

export function HospitalizeForm({ residentId, today }: { residentId: string; today: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    hospitalizeAction.bind(null, residentId),
    null,
  );
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <Field id="place" label="¿Dónde está internado/a?" required error={state?.fieldErrors?.place}>
        {(control) => (
          <Input
            {...control}
            name="place"
            placeholder="Hospital o clínica"
            defaultValue={state?.values?.place ?? ""}
          />
        )}
      </Field>
      <Field id="since" label="Desde" required error={state?.fieldErrors?.since}>
        {(control) => (
          <Input
            {...control}
            name="since"
            type="date"
            max={today}
            defaultValue={state?.values?.since ?? today}
          />
        )}
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="self-start">Marcar internado fuera</SubmitButton>
    </form>
  );
}

export function ReturnForm({ residentId, today }: { residentId: string; today: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    returnFromHospitalAction.bind(null, residentId),
    null,
  );
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <Field id="date" label="Volvió el" required error={state?.fieldErrors?.date}>
        {(control) => (
          <Input
            {...control}
            name="date"
            type="date"
            max={today}
            defaultValue={state?.values?.date ?? today}
          />
        )}
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="self-start">Volvió a la residencia</SubmitButton>
    </form>
  );
}

export function DischargeForm({ residentId, today }: { residentId: string; today: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    dischargeAction.bind(null, residentId),
    null,
  );
  const [confirming, setConfirming] = useState(false);
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <Field id="reason" label="Motivo" required error={state?.fieldErrors?.reason}>
        {(control) => (
          <Select {...control} name="reason" defaultValue={state?.values?.reason ?? ""}>
            <option value="" disabled>
              Elegí el motivo
            </option>
            {Object.entries(DISCHARGE_REASONS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field id="date" label="Fecha de egreso" required error={state?.fieldErrors?.date}>
        {(control) => (
          <Input
            {...control}
            name="date"
            type="date"
            max={today}
            defaultValue={state?.values?.date ?? today}
          />
        )}
      </Field>
      <Field id="notes" label="Observación" error={state?.fieldErrors?.notes}>
        {(control) => (
          <Textarea {...control} name="notes" rows={2} defaultValue={state?.values?.notes ?? ""} />
        )}
      </Field>
      <FormMessage state={state} />
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <SubmitButton variant="destructive">Sí, registrar el egreso</SubmitButton>
          <Button variant="ghost" onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="self-start text-destructive"
          onClick={() => setConfirming(true)}
        >
          Registrar egreso
        </Button>
      )}
    </form>
  );
}
