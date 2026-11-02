"use client";

import { useActionState } from "react";

import { NewPasswordFields } from "@/components/auth/new-password-fields";
import { Button } from "@/components/ui/button";
import { FieldMessage, Input, Label } from "@/components/ui/input";

import {
  acceptInvitationAction,
  acceptInvitationAsCurrentUserAction,
  type AcceptState,
} from "./actions";

/** Nombre y contraseña de quien todavía no tiene cuenta. */
export function AcceptInvitationForm({
  token,
  defaultName,
}: {
  token: string;
  defaultName: string;
}) {
  const [state, formAction, pending] = useActionState<AcceptState, FormData>(
    acceptInvitationAction,
    null,
  );
  const errorId = state?.error ? "invitacion-error" : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-[18px]" noValidate>
      <input type="hidden" name="token" value={token} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nombre y apellido</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          defaultValue={defaultName}
          maxLength={120}
          required
        />
      </div>
      <NewPasswordFields errorId={errorId} />
      {state?.error ? (
        <FieldMessage id={errorId} tone="error" role="alert">
          {state.error}
        </FieldMessage>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Creando tu cuenta…" : "Crear contraseña e ingresar"}
      </Button>
    </form>
  );
}

/** Confirmación para quien ya tiene cuenta y ya ingresó. */
export function AcceptAsCurrentUserForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<AcceptState, FormData>(
    acceptInvitationAsCurrentUserAction,
    null,
  );
  return (
    <form action={formAction} className="flex flex-col gap-[18px]">
      <input type="hidden" name="token" value={token} />
      {state?.error ? (
        <FieldMessage tone="error" role="alert">
          {state.error}
        </FieldMessage>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Aceptando…" : "Aceptar la invitación"}
      </Button>
    </form>
  );
}
