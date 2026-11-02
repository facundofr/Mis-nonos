"use client";

import { RotateCw } from "lucide-react";
import Link from "next/link";

import { Button, buttonClassName } from "@/components/ui/button";

/*
 * Error inesperado en una pantalla (sección 10.16): mensaje claro y botón
 * de reintento. No muestra detalles técnicos; el identificador sirve para
 * buscar el error en los registros del servidor.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5 px-6 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Algo salió mal</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          No pudimos completar lo que pediste. Puede ser un problema momentáneo de conexión con el
          servidor. Probá de nuevo en unos segundos.
        </p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground">Código del error: {error.digest}</p>
        ) : null}
      </div>
      <Button onClick={reset}>
        <RotateCw aria-hidden="true" className="size-4" />
        Reintentar
      </Button>
      <Link href="/ingresar" className={buttonClassName({ variant: "outline" })}>
        Ir al ingreso
      </Link>
    </main>
  );
}
