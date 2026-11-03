import { CalendarClock, Phone, Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { buttonClassName } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import type {
  ControlRow,
  EncounterRow,
  LastVisitRow,
  ProfessionalRow,
} from "@/features/care/queries";
import { fullName, telHref } from "@/features/residents/format";
import { formatDate, formatDateKey } from "@/lib/time/format";
import { cn } from "@/lib/utils";

import { EncounterList } from "./encounter-list";

const DAY_MS = 24 * 3600 * 1000;

function sinceLabel(lastAt: Date, now: Date, timeZone: string): string {
  const days = Math.floor((now.getTime() - lastAt.getTime()) / DAY_MS);
  const date = formatDate(lastAt, timeZone);
  if (days <= 0) return `Hoy · ${date}`;
  if (days === 1) return `Ayer · ${date}`;
  return `Hace ${days} días · ${date}`;
}

/** Botón principal: registrar una atención de esta especialidad. */
export function RecordEncounterLink({ href, label }: { href: Route; label: string }) {
  return (
    <Link href={href} className={buttonClassName({ size: "lg" })}>
      <Plus aria-hidden="true" className="size-5" />
      {label}
    </Link>
  );
}

/**
 * Vista de una especialidad: próximos controles, última visita de cada
 * paciente ("¿cuándo lo vio por última vez?", 3.9), últimas atenciones y
 * profesionales.
 */
export function SpecialtyOverview({
  specialtyName,
  lastVisits,
  encounters,
  controls,
  professionals,
  timeZone,
  today,
}: {
  specialtyName: string;
  lastVisits: LastVisitRow[];
  encounters: EncounterRow[];
  controls: ControlRow[];
  professionals: ProfessionalRow[];
  timeZone: string;
  today: string;
}) {
  const now = new Date();
  const never = lastVisits.filter((row) => !row.lastAt).length;

  return (
    <>
      {controls.length > 0 ? (
        <Card>
          <CardHeader
            title="Próximos controles"
            description="Pedidos en una atención. Se quitan solos cuando se registra la siguiente."
          />
          <ul className="flex flex-col">
            {controls.map((control) => {
              const overdue = control.nextControlOn < today;
              const isToday = control.nextControlOn === today;
              return (
                <li key={control.encounterId} className="border-t first:border-t-0">
                  <Link
                    href={`/atenciones/${control.encounterId}` as Route}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
                  >
                    <CalendarClock
                      aria-hidden="true"
                      className={cn(
                        "size-5 shrink-0",
                        overdue ? "text-destructive" : "text-muted-foreground",
                      )}
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-semibold">
                        {fullName({
                          firstName: control.residentFirstName,
                          lastName: control.residentLastName,
                        })}
                      </span>
                      <span className="truncate text-sm text-muted-foreground">
                        {control.specialtyName} · {control.reason}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-semibold",
                        overdue ? "text-destructive" : isToday ? "text-primary-ink" : "",
                      )}
                    >
                      {overdue ? "Atrasado · " : isToday ? "Hoy · " : ""}
                      {formatDateKey(control.nextControlOn).slice(0, 5)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Última visita por paciente"
          description={
            never > 0
              ? `${never} ${never === 1 ? "paciente sin" : "pacientes sin"} atenciones de ${specialtyName.toLocaleLowerCase("es-AR")} registradas.`
              : `Primero los que hace más tiempo que no tienen una atención de ${specialtyName.toLocaleLowerCase("es-AR")}.`
          }
        />
        {lastVisits.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">No hay pacientes activos.</p>
        ) : (
          <ul className="flex flex-col">
            {lastVisits.map((row) => (
              <li
                key={row.residentId}
                className="flex items-center justify-between gap-3 border-t px-5 py-3 first:border-t-0"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{fullName(row)}</span>
                  <span className="text-sm text-muted-foreground">
                    {row.roomLabel ? `Hab. ${row.roomLabel}` : "Sin habitación"}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 text-right text-sm",
                    row.lastAt ? "text-foreground" : "font-semibold text-warning-foreground",
                  )}
                >
                  {row.lastAt ? sinceLabel(row.lastAt, now, timeZone) : "Sin atenciones"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <section aria-labelledby="ultimas-atenciones" className="flex flex-col gap-3">
        <h2 id="ultimas-atenciones" className="text-lg font-semibold">
          Últimas atenciones
        </h2>
        <EncounterList
          encounters={encounters}
          timeZone={timeZone}
          showSpecialty={false}
          emptyText={`Todavía no hay atenciones de ${specialtyName.toLocaleLowerCase("es-AR")} registradas.`}
        />
      </section>

      <section aria-labelledby="profesionales" className="flex flex-col gap-3">
        <h2 id="profesionales" className="text-lg font-semibold">
          Profesionales
        </h2>
        {professionals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay profesionales de {specialtyName.toLocaleLowerCase("es-AR")} cargados. Se agregan
            desde{" "}
            <Link href="/profesionales" className="font-medium text-primary-ink underline">
              Profesionales
            </Link>
            .
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {professionals.map((professional) => (
              <li
                key={professional.id}
                className="flex items-center gap-3 rounded-[14px] border bg-card p-3.5"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold">{professional.name}</span>
                  <span className="truncate text-sm text-muted-foreground">
                    {[
                      professional.kind === "internal" ? "De la residencia" : "Externo",
                      professional.licenseNumber ? `Mat. ${professional.licenseNumber}` : null,
                      professional.institution,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                {professional.phone ? (
                  <a
                    href={telHref(professional.phone)}
                    aria-label={`Llamar a ${professional.name}`}
                    className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
                  >
                    <Phone aria-hidden="true" className="size-5" />
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
