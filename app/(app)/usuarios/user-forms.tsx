"use client";

import { Check, Copy } from "lucide-react";
import { useActionState, useState } from "react";

import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-status";
import { FieldMessage, Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { ROLE_DESCRIPTIONS } from "@/features/users/schemas";
import { ASSIGNABLE_ROLES, SYSTEM_ROLES } from "@/lib/auth/policy";
import type { FormState } from "@/lib/forms";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";

import {
  createWithEmailAction,
  createWithoutEmailAction,
  inviteAction,
  resendInvitationAction,
  resetPasswordAction,
  revokeInvitationAction,
  setMemberActiveAction,
  updateMemberAction,
  type CreatedWithEmailResult,
  type InvitationResult,
} from "./actions";

function RoleChooser({
  defaultValue,
  error,
  onChange,
}: {
  defaultValue?: string;
  error?: string;
  onChange?: (roleKey: string) => void;
}) {
  const names = Object.fromEntries(SYSTEM_ROLES.map((role) => [role.key, role.name]));
  // El Master no se elige: es una sola persona y su rol no cambia (0021).
  if (defaultValue === "master") {
    return (
      <div className="flex flex-col gap-1 rounded-xl border bg-muted/50 px-3.5 py-3">
        <input type="hidden" name="roleKey" value="master" />
        <span className="text-[15px] font-semibold">{names.master}</span>
        <span className="text-[13px] leading-snug text-muted-foreground">
          {ROLE_DESCRIPTIONS.master}
        </span>
      </div>
    );
  }
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? "rol-error" : undefined}>
      <legend className="mb-1.5 text-sm font-medium">Rol *</legend>
      {/* De menos a más permisos. */}
      {ASSIGNABLE_ROLES.map((key) => (
        <label
          key={key}
          className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card px-3.5 py-3 has-[:checked]:border-primary-ink has-[:checked]:bg-secondary"
        >
          <input
            type="radio"
            name="roleKey"
            value={key}
            defaultChecked={defaultValue === key}
            onChange={() => onChange?.(key)}
            className="mt-1 size-[18px] shrink-0 accent-primary-ink"
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold">{names[key]}</span>
            <span className="text-[13px] leading-snug text-muted-foreground">
              {ROLE_DESCRIPTIONS[key]}
            </span>
          </span>
        </label>
      ))}
      {error ? (
        <FieldMessage id="rol-error" tone="error">
          {error}
        </FieldMessage>
      ) : null}
    </fieldset>
  );
}

function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/50 p-3">
      <span className="text-[13px] font-medium">Enlace de invitación (vence en 72 h)</span>
      <code className="font-mono text-xs break-all text-muted-foreground">{link}</code>
      <Button
        variant="outline"
        size="md"
        className="self-start"
        onClick={async () => {
          await navigator.clipboard.writeText(link);
          setCopied(true);
        }}
      >
        {copied ? (
          <Check aria-hidden="true" className="size-4" />
        ) : (
          <Copy aria-hidden="true" className="size-4" />
        )}
        {copied ? "Copiado" : "Copiar enlace"}
      </Button>
    </div>
  );
}

type ProfileDefaults = {
  phone?: string | null;
  profession?: string | null;
  licenseNumber?: string | null;
};

function PhoneField({
  state,
  defaults,
}: {
  state: FormState<unknown>;
  defaults?: ProfileDefaults;
}) {
  return (
    <Field
      id="phone"
      label="Teléfono"
      hint="Opcional. Lo ve el resto del personal."
      error={state?.fieldErrors?.phone}
    >
      {(control) => (
        <Input
          {...control}
          name="phone"
          type="tel"
          inputMode="tel"
          defaultValue={state?.values?.phone ?? defaults?.phone ?? ""}
        />
      )}
    </Field>
  );
}

/**
 * El rol y, solo para Profesional, la profesión (obligatoria) y la matrícula
 * (docs/decisions/0021). Con otro rol esos campos no se muestran y se
 * guardan vacíos.
 */
function RoleAndProfession({
  state,
  defaults,
  defaultRole,
}: {
  state: FormState<unknown>;
  defaults?: ProfileDefaults;
  defaultRole: string;
}) {
  const values = state?.values;
  const [roleKey, setRoleKey] = useState(values?.roleKey ?? defaultRole);
  const isProfessional = roleKey === "profesional";
  return (
    <>
      <RoleChooser
        defaultValue={roleKey}
        error={state?.fieldErrors?.roleKey}
        onChange={setRoleKey}
      />
      {isProfessional ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="profession"
            label="Profesión"
            required
            hint="Por ejemplo Kinesiólogo, Médica o Nutricionista."
            error={state?.fieldErrors?.profession}
          >
            {(control) => (
              <Input
                {...control}
                name="profession"
                defaultValue={values?.profession ?? defaults?.profession ?? ""}
              />
            )}
          </Field>
          <Field
            id="licenseNumber"
            label="Matrícula"
            hint="Opcional."
            error={state?.fieldErrors?.licenseNumber}
          >
            {(control) => (
              <Input
                {...control}
                name="licenseNumber"
                defaultValue={values?.licenseNumber ?? defaults?.licenseNumber ?? ""}
              />
            )}
          </Field>
        </div>
      ) : (
        <>
          <input type="hidden" name="profession" value="" />
          <input type="hidden" name="licenseNumber" value="" />
        </>
      )}
    </>
  );
}

/**
 * Agregar usuario con email (docs/decisions/0018): la app genera una
 * contraseña provisoria y se la manda; al primer ingreso elige una propia.
 */
export function CreateWithEmailForm() {
  const [state, action] = useActionState<FormState<CreatedWithEmailResult>, FormData>(
    createWithEmailAction,
    null,
  );
  const [copied, setCopied] = useState(false);
  if (state?.data) {
    const { data } = state;
    return (
      <div className="flex flex-col gap-4">
        <Notice tone={data.emailSent ? "success" : "warning"}>{state.success}</Notice>
        {data.temporaryPassword ? (
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/50 p-3">
            <span className="text-[13px] font-medium">Contraseña provisoria de {data.email}</span>
            <code className="font-mono text-lg tracking-wide">{data.temporaryPassword}</code>
            <Button
              variant="outline"
              size="md"
              className="self-start"
              onClick={async () => {
                await navigator.clipboard.writeText(data.temporaryPassword ?? "");
                setCopied(true);
              }}
            >
              {copied ? (
                <Check aria-hidden="true" className="size-4" />
              ) : (
                <Copy aria-hidden="true" className="size-4" />
              )}
              {copied ? "Copiada" : "Copiar contraseña"}
            </Button>
            <FieldMessage>
              No se vuelve a mostrar. Si se pierde, generá otra desde su ficha.
            </FieldMessage>
          </div>
        ) : null}
        <p className="text-sm leading-relaxed text-muted-foreground">
          Entra en la app con su email y esa contraseña. Al primer ingreso elige una propia.
        </p>
        <Link
          href={`/usuarios/${data.membershipId}` as Route}
          className="self-start text-sm font-medium text-primary-ink underline-offset-4 hover:underline"
        >
          Ver su ficha
        </Link>
      </div>
    );
  }
  const values = state?.values;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field id="name" label="Nombre y apellido" required error={state?.fieldErrors?.name}>
        {(control) => (
          <Input {...control} name="name" autoComplete="off" defaultValue={values?.name ?? ""} />
        )}
      </Field>
      <Field
        id="email"
        label="Email"
        required
        hint="Le llega una contraseña provisoria a este email."
        error={state?.fieldErrors?.email}
      >
        {(control) => (
          <Input
            {...control}
            name="email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={values?.email ?? ""}
          />
        )}
      </Field>
      <PhoneField state={state} />
      <RoleAndProfession state={state} defaultRole="asistente" />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Creando…">Crear usuario y mandar contraseña</SubmitButton>
    </form>
  );
}

export function InviteForm() {
  const [state, action] = useActionState<FormState<InvitationResult>, FormData>(inviteAction, null);
  if (state?.data) {
    return (
      <div className="flex flex-col gap-4">
        <Notice tone={state.data.emailSent ? "success" : "warning"}>{state.success}</Notice>
        <p className="text-sm leading-relaxed text-muted-foreground">
          La persona recibe un email para crear su contraseña. Si no le llega, mandale el enlace por
          WhatsApp: sirve una sola vez.
        </p>
        <CopyLink link={state.data.link} />
      </div>
    );
  }
  const values = state?.values;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field id="name" label="Nombre y apellido" required error={state?.fieldErrors?.name}>
        {(control) => (
          <Input {...control} name="name" autoComplete="off" defaultValue={values?.name ?? ""} />
        )}
      </Field>
      <Field id="email" label="Email" required error={state?.fieldErrors?.email}>
        {(control) => (
          <Input
            {...control}
            name="email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={values?.email ?? ""}
          />
        )}
      </Field>
      <PhoneField state={state} />
      <RoleAndProfession state={state} defaultRole="asistente" />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Enviando…">Enviar invitación</SubmitButton>
      <FieldMessage className="text-center">
        Recibe un email para crear su contraseña. El enlace vence en 72 h.
      </FieldMessage>
    </form>
  );
}

export function CreateWithoutEmailForm({ suggestedPassword }: { suggestedPassword: string }) {
  const [state, action] = useActionState<FormState, FormData>(createWithoutEmailAction, null);
  const values = state?.values;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field id="name" label="Nombre y apellido" required error={state?.fieldErrors?.name}>
        {(control) => (
          <Input {...control} name="name" autoComplete="off" defaultValue={values?.name ?? ""} />
        )}
      </Field>
      <Field
        id="username"
        label="Usuario"
        required
        hint="Con esto entra. Letras minúsculas, números, punto o guion bajo; por ejemplo, juan.perez."
        error={state?.fieldErrors?.username}
      >
        {(control) => (
          <Input
            {...control}
            name="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            defaultValue={values?.username ?? ""}
          />
        )}
      </Field>
      <Field
        id="temporaryPassword"
        label="Contraseña provisoria"
        required
        hint="Dásela en persona. Al entrar por primera vez va a tener que elegir una propia."
        error={state?.fieldErrors?.temporaryPassword}
      >
        {(control) => (
          <PasswordInput
            {...control}
            name="temporaryPassword"
            autoComplete="off"
            defaultValue={suggestedPassword}
          />
        )}
      </Field>
      <PhoneField state={state} />
      <RoleAndProfession state={state} defaultRole="asistente" />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Creando…">Crear usuario</SubmitButton>
    </form>
  );
}

export function MemberForm({
  membershipId,
  defaults,
  shifts,
}: {
  membershipId: string;
  defaults: {
    roleKey: string;
    phone: string | null;
    profession: string | null;
    licenseNumber: string | null;
    usualShiftId: string | null;
  };
  shifts: { id: string; label: string }[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    updateMemberAction.bind(null, membershipId),
    null,
  );
  const values = state?.values;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <RoleAndProfession state={state} defaults={defaults} defaultRole={defaults.roleKey} />
      <Field
        id="usualShiftId"
        label="Turno habitual"
        hint="Para el filtro “En turno ahora” de Empleados."
        error={state?.fieldErrors?.usualShiftId}
      >
        {(control) => (
          <Select
            {...control}
            name="usualShiftId"
            defaultValue={values?.usualShiftId ?? defaults.usualShiftId ?? ""}
          >
            <option value="">Sin turno fijo</option>
            {shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <PhoneField state={state} defaults={defaults} />
      <FormMessage state={state} />
      <SubmitButton className="self-start">Guardar cambios</SubmitButton>
    </form>
  );
}

export function MemberStatusButton({
  membershipId,
  active,
  name,
}: {
  membershipId: string;
  active: boolean;
  name: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    setMemberActiveAction.bind(null, membershipId, !active),
    null,
  );
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <FormMessage state={state} />
      {active && !confirming ? (
        <Button
          variant="outline"
          className="self-start text-destructive"
          onClick={() => setConfirming(true)}
        >
          Desactivar a {name}
        </Button>
      ) : (
        <form action={action} className="flex flex-col gap-3">
          {active ? (
            <p className="text-sm leading-relaxed">
              {name} no va a poder entrar a la residencia. Su nombre queda en todo lo que registró.
              ¿Desactivar?
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <SubmitButton variant={active ? "destructive" : "primary"} pendingLabel="Guardando…">
              {active ? "Sí, desactivar" : "Reactivar"}
            </SubmitButton>
            {active ? (
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>
      )}
    </div>
  );
}

export function ResetPasswordForm({
  membershipId,
  suggestedPassword,
}: {
  membershipId: string;
  suggestedPassword: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    resetPasswordAction.bind(null, membershipId),
    null,
  );
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field
        id="temporaryPassword"
        label="Contraseña provisoria nueva"
        hint="Se cierran sus sesiones abiertas y, al entrar, elige una propia."
        error={state?.fieldErrors?.temporaryPassword}
      >
        {(control) => (
          <PasswordInput
            {...control}
            name="temporaryPassword"
            autoComplete="off"
            defaultValue={suggestedPassword}
          />
        )}
      </Field>
      <FormMessage state={state} />
      <SubmitButton variant="outline" className="self-start">
        Restablecer contraseña
      </SubmitButton>
    </form>
  );
}

export function InvitationActions({ invitationId }: { invitationId: string }) {
  const [resent, resend] = useActionState<FormState<InvitationResult>, FormData>(
    resendInvitationAction.bind(null, invitationId),
    null,
  );
  const [revoked, revoke] = useActionState<FormState, FormData>(
    revokeInvitationAction.bind(null, invitationId),
    null,
  );
  return (
    <div className="flex flex-col gap-2">
      <div className={cn("flex flex-wrap gap-2", revoked?.success && "hidden")}>
        <form action={resend}>
          <SubmitButton variant="outline" size="md" pendingLabel="Reenviando…">
            Reenviar
          </SubmitButton>
        </form>
        <form action={revoke}>
          <SubmitButton variant="ghost" size="md" pendingLabel="Anulando…">
            Anular
          </SubmitButton>
        </form>
      </div>
      <FormMessage state={revoked ?? resent} />
      {resent?.data ? <CopyLink link={resent.data.link} /> : null}
    </div>
  );
}
