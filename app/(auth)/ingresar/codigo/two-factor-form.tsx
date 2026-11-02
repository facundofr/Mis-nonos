"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldMessage, Input, Label } from "@/components/ui/input";

import { verifyTwoFactorAction, type TwoFactorState } from "./actions";

export function TwoFactorForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<TwoFactorState, FormData>(
    verifyTwoFactorAction,
    null,
  );
  const [mode, setMode] = useState<"totp" | "backup">("totp");
  const errorId = state?.error ? "codigo-error" : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-[18px]" noValidate>
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="mode" value={mode} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="code">
          {mode === "totp" ? "Código de 6 dígitos" : "Código de respaldo"}
        </Label>
        <Input
          key={mode}
          id="code"
          name="code"
          autoComplete="one-time-code"
          inputMode={mode === "totp" ? "numeric" : "text"}
          maxLength={mode === "totp" ? 6 : 32}
          autoCapitalize="none"
          spellCheck={false}
          required
          className="font-mono tracking-[0.2em]"
          aria-invalid={errorId ? true : undefined}
          aria-describedby={errorId}
        />
      </div>

      {state?.error ? (
        <FieldMessage id={errorId} tone="error" role="alert">
          {state.error}
        </FieldMessage>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Verificando…" : "Verificar"}
      </Button>

      <button
        type="button"
        onClick={() => setMode((current) => (current === "totp" ? "backup" : "totp"))}
        className="self-center text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {mode === "totp"
          ? "No tengo el teléfono: usar un código de respaldo"
          : "Usar el código de la app"}
      </button>
    </form>
  );
}
