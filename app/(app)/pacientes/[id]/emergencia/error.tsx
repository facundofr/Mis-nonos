"use client";

import { RotateCw, TriangleAlert } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Button, buttonClassName } from "@/components/ui/button";

/*
 * Error al abrir la ficha de emergencia. Primero lo que hay que hacer si la
 * urgencia no puede esperar; después reintentar o volver a la ficha. Sin
 * detalles técnicos: el código sirve para buscar el error en los registros.
 */
export default function EmergencyError({ error, retry }: { error: unknown; retry: () => void }) {
  const { id } = useParams<{ id: string }>();
  const digest =
    error instanceof Error && "digest" in error && typeof error.digest === "string"
      ? error.digest
      : null;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div
        role="alert"
        className="flex flex-col gap-2 rounded-[14px] border-2 border-danger-border bg-danger-surface p-4 text-danger-surface-foreground"
      >
        <h1 className="flex items-start gap-2 text-lg leading-snug font-bold">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          No pudimos abrir la ficha de emergencia
        </h1>
        <p className="text-[15px]">
          Si es una urgencia, no esperes a la app: llamá al servicio de emergencias de la residencia
          y avisá a Administración.
        </p>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Puede ser un problema momentáneo de conexión. Probá de nuevo en unos segundos.
      </p>
      <Button onClick={() => retry()}>
        <RotateCw aria-hidden="true" className="size-4" />
        Reintentar
      </Button>
      {id ? (
        <Link
          href={`/pacientes/${id}` as Route}
          className={buttonClassName({ variant: "outline" })}
        >
          Volver a la ficha del paciente
        </Link>
      ) : null}
      {digest ? <p className="text-xs text-muted-foreground">Código del error: {digest}</p> : null}
    </div>
  );
}
