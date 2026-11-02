"use client";

import { FieldMessage, Label } from "@/components/ui/input";
import { AUTH_POLICY } from "@/lib/auth/policy";

import { PasswordInput } from "./password-input";

/** Contraseña nueva y su confirmación (restablecer e invitación). */
export function NewPasswordFields({ errorId }: { errorId?: string }) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Contraseña nueva</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          minLength={AUTH_POLICY.passwordMinLength}
          maxLength={AUTH_POLICY.passwordMaxLength}
          required
          aria-invalid={errorId ? true : undefined}
          aria-describedby={errorId ? `password-hint ${errorId}` : "password-hint"}
        />
        <FieldMessage id="password-hint">
          Al menos {AUTH_POLICY.passwordMinLength} caracteres. Una frase corta es fácil de recordar
          y difícil de adivinar.
        </FieldMessage>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm">Repetí la contraseña</Label>
        <PasswordInput
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          maxLength={AUTH_POLICY.passwordMaxLength}
          required
          aria-invalid={errorId ? true : undefined}
          aria-describedby={errorId}
        />
      </div>
    </>
  );
}
