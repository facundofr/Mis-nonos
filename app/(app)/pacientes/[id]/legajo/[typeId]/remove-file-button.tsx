"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/form-status";

/** Quitar una foto: no se borra, queda en el historial (pide confirmación). */
export function RemoveFileButton({ action }: { action: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <Button
        variant="ghost"
        size="md"
        className="text-destructive"
        onClick={() => setConfirming(true)}
      >
        Quitar
      </Button>
    );
  }
  return (
    <form action={action} className="flex items-center gap-2">
      <SubmitButton variant="destructive" size="md" pendingLabel="Quitando…">
        Sí, quitar
      </SubmitButton>
      <Button variant="ghost" size="md" onClick={() => setConfirming(false)}>
        Cancelar
      </Button>
    </form>
  );
}
