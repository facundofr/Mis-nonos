"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { FieldMessage, Input, Label } from "@/components/ui/input";

import { loginAction, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, null);
  // Controlados: React vacía el formulario después de cada envío.
  const [identifier, setIdentifier] = useState("");
  const [remember, setRemember] = useState(false);
  const errorId = state?.error ? "ingreso-error" : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-[18px]" noValidate>
      <input type="hidden" name="next" value={next} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="identifier">Email o usuario</Label>
        <Input
          id="identifier"
          name="identifier"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          aria-invalid={errorId ? true : undefined}
          aria-describedby={errorId}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="password">Contraseña</Label>
          <Link
            href="/recuperar"
            className="text-[13px] font-medium text-primary-ink underline-offset-4 hover:underline"
          >
            ¿La olvidaste?
          </Link>
        </div>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          aria-invalid={errorId ? true : undefined}
          aria-describedby={errorId}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="remember"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="size-[18px] accent-primary-ink"
          />
          Mantener sesión en este dispositivo
        </label>
        <FieldMessage className="pl-7">
          Solo en un dispositivo tuyo. Sin tildar, la sesión dura 12 horas.
        </FieldMessage>
      </div>

      {state?.error ? (
        <FieldMessage id={errorId} tone="error" role="alert">
          {state.error}
        </FieldMessage>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}
