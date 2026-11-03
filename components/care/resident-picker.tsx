import { Search, TriangleAlert } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { fullName } from "@/features/residents/format";

interface PickerResident {
  id: string;
  firstName: string;
  lastName: string;
  roomLabel: string | null;
  status: string;
  hasAllergies: boolean;
}

/**
 * Primer paso de "Registrar atención" y "Registrar emergencia": elegir el
 * paciente, con búsqueda por nombre o habitación (como en Nueva novedad).
 */
export function ResidentPicker({
  residents,
  query,
  hrefFor,
  hidden = {},
}: {
  residents: PickerResident[];
  query: string;
  hrefFor: (residentId: string) => Route;
  /** Parámetros que se conservan al buscar. */
  hidden?: Record<string, string>;
}) {
  return (
    <>
      <form role="search" className="relative">
        <label htmlFor="buscar" className="sr-only">
          Buscar paciente
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-3.5 left-3.5 size-5 text-muted-foreground"
        />
        <Input
          id="buscar"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Nombre o habitación"
          className="pl-11"
        />
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      </form>
      <ul className="flex flex-col gap-2">
        {residents.map((resident) => {
          const name = fullName(resident);
          return (
            <li key={resident.id}>
              <Link
                href={hrefFor(resident.id)}
                className="flex min-h-16 items-center gap-3 rounded-[14px] border bg-card p-3.5 hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
              >
                <Avatar name={name} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold">{name}</span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    {[
                      resident.roomLabel ? `Hab. ${resident.roomLabel}` : "Sin habitación",
                      resident.status === "hospitalized" ? "Internado fuera" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    {resident.hasAllergies ? (
                      <span className="flex items-center gap-1 text-destructive">
                        · <TriangleAlert aria-hidden="true" className="size-3.5" /> Alergia
                      </span>
                    ) : null}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {residents.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          {query
            ? `No hay pacientes activos que coincidan con “${query}”.`
            : "No hay pacientes activos."}
        </p>
      ) : null}
    </>
  );
}
