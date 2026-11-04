import { TriangleAlert } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { ResidentPicker } from "@/components/care/resident-picker";
import { Avatar } from "@/components/ui/avatar";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { getSpecialty, listProfessionals, listSpecialties } from "@/features/care/queries";
import { fullName } from "@/features/residents/format";
import { getResident, listAllergies, listResidents } from "@/features/residents/queries";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { toLocal } from "@/lib/time/zoned";

import type { EncounterReturn } from "../actions";
import { EncounterForm } from "../encounter-forms";

export const metadata: Metadata = { title: "Registrar atención" };

const id = z.uuid();

/**
 * Registrar una atención (6.11): primero el paciente; después, especialidad,
 * quién atendió, cuándo, motivo, observaciones e indicaciones.
 */
export default async function NewEncounterPage({ searchParams }: PageProps<"/atenciones/nueva">) {
  const context = await requirePermission("care.record");
  const params = await searchParams;
  const back: EncounterReturn = params.volver === "especialidad" ? "especialidad" : "atencion";
  const specialtyParam = id.safeParse(params.especialidad);
  const specialtyId = specialtyParam.success ? specialtyParam.data : "";
  const residentParam = id.safeParse(params.paciente);
  const query = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const keep: Record<string, string> = { volver: back };
  if (specialtyId) keep.especialidad = specialtyId;
  const href = (extra: Record<string, string>) =>
    `/atenciones/nueva?${new URLSearchParams({ ...keep, ...extra }).toString()}` as Route;

  const { site } = await getSiteContext(context);
  const backLink = await inTenant(context, async (tx) => {
    const specialty = specialtyId ? await getSpecialty(tx, specialtyId) : null;
    return specialty
      ? { href: `/especialidades/${specialty.id}` as Route, label: specialty.name }
      : { href: "/especialidades" as Route, label: "Especialidades" };
  });

  if (!residentParam.success) {
    const residents = await inTenant(context, (tx) =>
      listResidents(tx, { view: "activos", query, limit: 100 }),
    );
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <PageHeader title="Registrar atención" description="¿A quién atendieron?" back={backLink} />
        <ResidentPicker
          residents={residents}
          query={query}
          hidden={keep}
          hrefFor={(residentId) => href({ paciente: residentId })}
        />
      </div>
    );
  }

  const residentId = residentParam.data;
  const data = await inTenant(context, async (tx) => ({
    resident: await getResident(tx, residentId),
    allergies: await listAllergies(tx, residentId),
    specialties: await listSpecialties(tx, { activeOnly: true }),
    professionals: await listProfessionals(tx, { activeOnly: true }),
  }));
  const resident = data.resident;
  if (!resident) notFound();
  const name = fullName(resident);
  const inactive = !["active", "hospitalized"].includes(resident.status);
  const local = toLocal(new Date(), site.timezone);
  const pad = (value: number) => String(value).padStart(2, "0");

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <PageHeader title="Registrar atención" back={backLink} />
      <section aria-label="Paciente" className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Paciente</span>
        <div className="flex items-center gap-3 rounded-[14px] border bg-card p-3.5">
          <Avatar name={name} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-semibold">{name}</span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              {resident.roomLabel ? `Hab. ${resident.roomLabel}` : "Sin habitación"}
              {data.allergies.length > 0 ? (
                <span className="flex items-center gap-1 text-destructive">
                  · <TriangleAlert aria-hidden="true" className="size-3.5" /> Alergia
                </span>
              ) : null}
            </span>
          </span>
          <Link
            href={href(query ? { q: query } : {})}
            className="flex min-h-11 items-center px-1 text-sm font-medium text-primary-ink underline-offset-4 hover:underline"
          >
            Cambiar
          </Link>
        </div>
      </section>
      {inactive ? (
        <Notice tone="warning">
          {name} no está activo/a: no se le pueden registrar atenciones.
        </Notice>
      ) : (
        <EncounterForm
          residentId={residentId}
          back={back}
          specialties={data.specialties}
          professionals={data.professionals}
          defaults={{
            specialtyId,
            date: `${local.year}-${pad(local.month)}-${pad(local.day)}`,
            time: `${pad(local.hour)}:${pad(local.minute)}`,
          }}
        />
      )}
    </div>
  );
}
