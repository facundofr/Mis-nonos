import { Siren } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

/*
 * Mientras carga la ficha de emergencia (13.5, "carga rápida"): se ve al
 * instante, con la forma de la ficha y un texto que dice qué está pasando,
 * para que nadie toque de nuevo ni piense que no anduvo.
 */
export default function EmergencyLoading() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4" aria-busy="true">
      <p
        role="status"
        className="inline-flex w-fit items-center gap-1.5 rounded-full bg-danger-surface px-3 py-1 text-sm font-semibold text-danger-surface-foreground"
      >
        <Siren aria-hidden="true" className="size-4" />
        Abriendo la ficha de emergencia…
      </p>

      <div className="flex items-center gap-3">
        <Skeleton className="size-14 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-3/5" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-[14px] border-2 border-danger-border bg-danger-surface p-4">
        <Skeleton className="h-5 w-1/2 bg-danger-border/60" />
        <Skeleton className="h-4 w-1/3 bg-danger-border/60" />
      </div>

      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="flex min-h-16 items-center gap-3 rounded-[14px] border bg-card px-4 py-3"
        >
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-11 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}
