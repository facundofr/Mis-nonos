import { ChevronRight, Stethoscope } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { listSpecialties } from "@/features/care/queries";
import { inTenant } from "@/lib/actions";
import { can, requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { formatWhen } from "@/lib/time/format";

import { SpecialtyForm } from "./specialty-form";

export const metadata: Metadata = { title: "Especialidades" };

/**
 * Especialidades (8.7): cada una con sus profesionales y la fecha de la
 * última atención. Al entrar, la última visita de cada paciente.
 */
export default async function SpecialtiesPage() {
  const context = await requirePermission("care.read");
  const [specialties, canManage, site] = await Promise.all([
    inTenant(context, (tx) => listSpecialties(tx)),
    can(context, "care.manage"),
    getSiteContext(context),
  ]);
  const active = specialties.filter((row) => row.active);
  const inactive = specialties.filter((row) => !row.active);
  const now = new Date();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader
        title="Especialidades"
        description="Tocá una para ver cuándo vio a cada paciente por última vez."
      />

      {active.length === 0 ? (
        <div className="rounded-[14px] border bg-card">
          <EmptyState icon={Stethoscope} title="Sin especialidades activas" />
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {active.map((specialty) => (
            <li key={specialty.id}>
              <Link
                href={`/especialidades/${specialty.id}` as Route}
                className="flex min-h-16 items-center gap-3 rounded-[14px] border bg-card p-3.5 hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <Stethoscope aria-hidden="true" className="size-5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold">{specialty.name}</span>
                  <span className="truncate text-sm text-muted-foreground">
                    {specialty.professionals === 0
                      ? "Sin profesionales"
                      : specialty.professionals === 1
                        ? "1 profesional"
                        : `${specialty.professionals} profesionales`}
                    {" · "}
                    {specialty.lastEncounterAt
                      ? `Última atención ${formatWhen(specialty.lastEncounterAt, now, site.site.timezone)}`
                      : "Sin atenciones"}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-5 shrink-0 text-muted-foreground"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {canManage ? (
        <>
          <Card>
            <CardHeader
              title="Agregar especialidad"
              description="Por ejemplo, Cardiología o Traumatología."
            />
            <div className="p-5">
              <SpecialtyForm />
            </div>
          </Card>
          <details className="rounded-[14px] border bg-card">
            <summary className="flex h-12 cursor-pointer items-center px-4 text-[15px] font-medium">
              Renombrar o desactivar especialidades
            </summary>
            <ul className="flex flex-col gap-4 p-4 pt-0">
              {[...active, ...inactive].map((specialty) => (
                <li key={specialty.id} className="rounded-[12px] border p-4">
                  <p className="mb-3 text-sm text-muted-foreground">
                    {specialty.name}
                    {specialty.active ? "" : " · Inactiva"}
                  </p>
                  <SpecialtyForm
                    specialty={{
                      id: specialty.id,
                      name: specialty.name,
                      active: specialty.active,
                    }}
                  />
                </li>
              ))}
            </ul>
          </details>
        </>
      ) : null}
    </div>
  );
}
