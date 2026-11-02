import { cn } from "@/lib/utils";

/** Bloque gris mientras carga (diseño EstadosUI). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("block animate-pulse rounded-md bg-muted", className)} />
  );
}

/** Lista de filas cargando. */
export function ListSkeleton({ rows = 5, label }: { rows?: number; label: string }) {
  return (
    <div aria-busy="true" aria-label={label} className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-[14px] border bg-card p-4">
          <Skeleton className="size-11 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
