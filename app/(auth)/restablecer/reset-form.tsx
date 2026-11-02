"use client";

import Link from "next/link";
import { useActionState } from "react";

import { NewPasswordFields } from "@/components/auth/new-password-fields";
import { Button } from "@/components/ui/button";
import { FieldMessage } from "@/components/ui/input";

import { resetPasswordAction, type ResetState } from "./actions";

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    resetPasswordAction,
    null,
  );
  const errorId = state?.error ? "restablecer-error" : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-[18px]" noValidate>
      <input type="hidden" name="token" value={token} />
      <NewPasswordFields errorId={errorId} />
      {state?.error ? (
        <FieldMessage id={errorId} tone="error" role="alert">
          {state.error}{" "}
          {state.linkExpired ? (
            <Link href="/recuperar" className="underline underline-offset-4">
              Pedir un enlace nuevo
            </Link>
          ) : null}
        </FieldMessage>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}
