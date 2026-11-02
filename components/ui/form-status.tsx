"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import type { FormState } from "@/lib/forms";

import { Button } from "./button";
import { Notice } from "./notice";

/** Botón de envío que se deshabilita y cambia el texto mientras se guarda. */
export function SubmitButton({
  children,
  pendingLabel = "Guardando…",
  ...props
}: Omit<ComponentProps<typeof Button>, "type"> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

/** Resultado general de un formulario: error o éxito, anunciado por lectores de pantalla. */
export function FormMessage({ state }: { state: FormState<unknown> }) {
  if (state?.error) return <Notice tone="error">{state.error}</Notice>;
  if (state?.success) return <Notice tone="success">{state.success}</Notice>;
  return null;
}
