"use client";

import { LogIn, LogOut } from "lucide-react";
import { useActionState } from "react";

import { FormMessage, SubmitButton } from "@/components/ui/form-status";
import type { FormState } from "@/lib/forms";

import { recordAttendanceAction } from "./actions";

/** El botón grande de la pantalla del QR: entrada o salida. */
export function AttendanceButton({ token, kind }: { token: string; kind: "in" | "out" }) {
  const [state, action] = useActionState<FormState, FormData>(
    recordAttendanceAction.bind(null, token),
    null,
  );
  const Icon = kind === "in" ? LogIn : LogOut;
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormMessage state={state} />
      <SubmitButton
        size="lg"
        variant={kind === "in" ? "primary" : "outline"}
        pendingLabel="Registrando…"
        className="h-16 text-lg"
      >
        <Icon aria-hidden="true" className="size-6" />
        {kind === "in" ? "Registrar entrada" : "Registrar salida"}
      </SubmitButton>
    </form>
  );
}
