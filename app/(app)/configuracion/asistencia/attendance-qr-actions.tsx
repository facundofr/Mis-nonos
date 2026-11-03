"use client";

import { Printer, RefreshCw } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage, SubmitButton } from "@/components/ui/form-status";
import type { FormState } from "@/lib/forms";

import { rotateAttendanceTokenAction } from "./actions";

/** Imprimir el QR. */
export function PrintButton() {
  return (
    <Button size="lg" onClick={() => window.print()}>
      <Printer aria-hidden="true" className="size-5" />
      Imprimir el QR
    </Button>
  );
}

/** Cambiar el código, con confirmación: el QR impreso deja de funcionar. */
export function RotateTokenButton() {
  const [state, action] = useActionState<FormState, FormData>(rotateAttendanceTokenAction, null);
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <div className="flex flex-col gap-3">
        <FormMessage state={state} />
        <Button
          variant="outline"
          size="md"
          className="self-start"
          onClick={() => setConfirming(true)}
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          Cambiar el código
        </Button>
      </div>
    );
  }
  return (
    <form
      action={(formData) => {
        setConfirming(false);
        action(formData);
      }}
      className="flex flex-col gap-3 rounded-[14px] border bg-card p-4"
    >
      <p className="text-sm">
        El QR impreso deja de funcionar: nadie puede registrar asistencia hasta que pegues el nuevo.
      </p>
      <div className="flex flex-wrap gap-2">
        <SubmitButton variant="destructive" size="md" pendingLabel="Cambiando…">
          Sí, cambiar el código
        </SubmitButton>
        <Button variant="ghost" size="md" onClick={() => setConfirming(false)}>
          Volver
        </Button>
      </div>
    </form>
  );
}
