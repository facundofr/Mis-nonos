"use client";

import { KeyRound, MailCheck } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { AuthHeading } from "@/components/auth/auth-shell";
import { Button, buttonClassName } from "@/components/ui/button";
import { FieldMessage, Input, Label } from "@/components/ui/input";
import { BRAND } from "@/lib/brand";

import { requestPasswordResetAction, type RecoverState } from "./actions";

export function RecoverForm() {
  const [state, formAction, pending] = useActionState<RecoverState, FormData>(
    requestPasswordResetAction,
    null,
  );

  if (state && "sent" in state) {
    return (
      <>
        <IconBadge>
          <MailCheck aria-hidden="true" className="size-[26px]" />
        </IconBadge>
        <AuthHeading
          title="Revisá tu email"
          description={`Si el email está registrado en ${BRAND.appName}, vas a recibir el enlace en unos minutos. Mirá también en spam.`}
        />
        <Link href="/ingresar" className={buttonClassName({ variant: "outline" })}>
          Volver a ingresar
        </Link>
      </>
    );
  }

  const errorId = state && "error" in state ? "recuperar-error" : undefined;
  return (
    <>
      <IconBadge>
        <KeyRound aria-hidden="true" className="size-[26px]" />
      </IconBadge>
      <AuthHeading
        title="Recuperar contraseña"
        description="Te mandamos un enlace para crear una nueva. Vence en 30 minutos."
      />
      <form action={formAction} className="flex flex-col gap-[18px]" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={errorId ? true : undefined}
            aria-describedby={errorId}
          />
        </div>
        {state && "error" in state ? (
          <FieldMessage id={errorId} tone="error" role="alert">
            {state.error}
          </FieldMessage>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando…" : "Enviar enlace"}
        </Button>
      </form>
    </>
  );
}

function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
      {children}
    </span>
  );
}
