"use client";

import { useActionState } from "react";

import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { FieldMessage, Input, Label } from "@/components/ui/input";

import {
  confirmTwoFactorAction,
  startTwoFactorSetupAction,
  type ConfirmState,
  type SetupState,
} from "./actions";

export function TwoFactorSetup() {
  const [setup, startAction, starting] = useActionState<SetupState, FormData>(
    startTwoFactorSetupAction,
    null,
  );
  const [confirm, confirmAction, confirming] = useActionState<ConfirmState, FormData>(
    confirmTwoFactorAction,
    null,
  );

  if (!setup || "error" in setup) {
    const errorId = setup ? "clave-error" : undefined;
    return (
      <Step number={1} title="Confirmá tu contraseña">
        <form action={startAction} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              required
              aria-invalid={errorId ? true : undefined}
              aria-describedby={errorId}
            />
          </div>
          {setup ? (
            <FieldMessage id={errorId} tone="error" role="alert">
              {setup.error}
            </FieldMessage>
          ) : null}
          <Button type="submit" disabled={starting}>
            {starting ? "Preparando…" : "Continuar"}
          </Button>
        </form>
      </Step>
    );
  }

  const errorId = confirm?.error ? "codigo-error" : undefined;
  return (
    <div className="flex flex-col gap-5">
      <Step number={1} title="Escaneá el código con tu teléfono">
        <p className="text-sm text-muted-foreground">
          Usá una app de autenticación, por ejemplo Google Authenticator o Microsoft Authenticator.
        </p>
        <div className="self-center rounded-xl border bg-white p-3">
          {/* SVG generado en el servidor a partir de la URI del 2FA. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- es un data URI */}
          <img
            src={`data:image/svg+xml;utf8,${encodeURIComponent(setup.qrSvg)}`}
            alt="Código QR para la app de autenticación"
            width={200}
            height={200}
          />
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-primary-ink">
            No puedo escanear: escribir la clave a mano
          </summary>
          <p className="mt-2 rounded-lg bg-muted p-3 font-mono text-[13px] break-all">
            {setup.secret.replace(/(.{4})/g, "$1 ").trim()}
          </p>
        </details>
      </Step>

      <Step number={2} title="Guardá los códigos de respaldo">
        <p className="text-sm text-muted-foreground">
          Sirven para ingresar si perdés el teléfono. Cada uno se usa una sola vez. Anotalos y
          guardalos en un lugar seguro: no se vuelven a mostrar.
        </p>
        <ul className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-3 font-mono text-[13px]">
          {setup.backupCodes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
      </Step>

      <Step number={3} title="Escribí el código que muestra la app">
        <form action={confirmAction} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">Código de 6 dígitos</Label>
            <Input
              id="code"
              name="code"
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              required
              className="font-mono tracking-[0.2em]"
              aria-invalid={errorId ? true : undefined}
              aria-describedby={errorId}
            />
          </div>
          {confirm?.error ? (
            <FieldMessage id={errorId} tone="error" role="alert">
              {confirm.error}
            </FieldMessage>
          ) : null}
          <Button type="submit" disabled={confirming}>
            {confirming ? "Activando…" : "Activar"}
          </Button>
        </form>
      </Step>
    </div>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-[14px] border bg-card p-5 text-card-foreground">
      <h2 className="flex items-center gap-2.5 text-base font-semibold">
        <span className="flex size-6 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
          {number}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}
