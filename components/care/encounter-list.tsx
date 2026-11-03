import { ChevronRight, ClipboardPlus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { EncounterRow } from "@/features/care/queries";
import { fullName } from "@/features/residents/format";
import { formatWhen } from "@/lib/time/format";

/** Lista de atenciones: paciente, especialidad, motivo, quién y cuándo. */
export function EncounterList({
  encounters,
  timeZone,
  showSpecialty = true,
  emptyText,
}: {
  encounters: EncounterRow[];
  timeZone: string;
  showSpecialty?: boolean;
  emptyText: string;
}) {
  if (encounters.length === 0) {
    return (
      <div className="rounded-[14px] border bg-card">
        <EmptyState icon={ClipboardPlus} title="Sin atenciones">
          {emptyText}
        </EmptyState>
      </div>
    );
  }
  const now = new Date();
  return (
    <ul className="flex flex-col gap-2">
      {encounters.map((encounter) => (
        <li key={encounter.id}>
          <Link
            href={`/atenciones/${encounter.id}` as Route}
            className="flex items-center gap-3 rounded-[14px] border bg-card p-3.5 hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex flex-wrap items-center gap-2">
                <span className="truncate font-semibold">
                  {fullName({
                    firstName: encounter.residentFirstName,
                    lastName: encounter.residentLastName,
                  })}
                </span>
                {encounter.voidedAt ? <Badge tone="neutral">Anulada</Badge> : null}
              </span>
              <span
                className={
                  encounter.voidedAt
                    ? "truncate text-[15px] text-muted-foreground line-through"
                    : "truncate text-[15px]"
                }
              >
                {showSpecialty ? `${encounter.specialtyName} · ` : ""}
                {encounter.reason}
              </span>
              <span className="truncate text-sm text-muted-foreground">
                {formatWhen(encounter.occurredAt, now, timeZone)} ·{" "}
                {encounter.professionalName ?? encounter.authorName}
              </span>
            </span>
            <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
