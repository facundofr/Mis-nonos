import { Siren } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { ResidentPicker } from "@/components/care/resident-picker";
import { Avatar } from "@/components/ui/avatar";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { fullName } from "@/features/residents/format";
import { getResident, listResidents } from "@/features/residents/queries";
import { inTenant } from "@/lib/actions";
import { can, requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { toLocal } from "@/lib/time/zoned";

import { EmergencyForm } from "../emergency-forms";

export const metadata: Metadata = { title: "Registrar emergencia" };

/** Registrar una emergencia: primero el paciente, después qué pasó. */
export default async function NewEmergencyPage({ searchParams }: PageProps<"/emergencias/nueva">) {
  const context = await requirePermission("emergencies.manage");
  const params = await searchParams;
  const residentParam = z.uuid().safeParse(params.paciente);
  const query = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const back = { href: "/emergencias" as Route, label: "Emergencias" };

  if (!residentParam.success) {
    const residents = await inTenant(context, (tx) =>
      listResidents(tx, { view: "activos", query, limit: 100 }),
    );
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <PageHeader title="Registrar emergencia" description="¿A quién le pasó?" back={back} />
        <ResidentPicker
          residents={residents}
          query={query}
          hrefFor={(residentId) => `/emergencias/nueva?paciente=${residentId}` as Route}
        />
      </div>
    );
  }

  const residentId = residentParam.data;
  const [{ site }, resident, canViewSheet] = await Promise.all([
    getSiteContext(context),
    inTenant(context, (tx) => getResident(tx, residentId)),
    can(context, "emergency.view"),
  ]);
  if (!resident) notFound();
  const name = fullName(resident);
  const inactive = !["active", "hospitalized"].includes(resident.status);
  const local = toLocal(new Date(), site.timezone);
  const pad = (value: number) => String(value).padStart(2, "0");

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <PageHeader title="Registrar emergencia" back={back} />
      <section aria-label="Paciente" className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Paciente</span>
        <div className="flex items-center gap-3 rounded-[14px] border bg-card p-3.5">
          <Avatar name={name} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-semibold">{name}</span>
            <span className="text-sm text-muted-foreground">
              {resident.roomLabel ? `Hab. ${resident.roomLabel}` : "Sin habitación"}
            </span>
          </span>
          <Link
            href="/emergencias/nueva"
            className="flex min-h-11 items-center px-1 text-sm font-medium text-primary-ink underline-offset-4 hover:underline"
          >
            Cambiar
          </Link>
        </div>
      </section>
      {canViewSheet ? (
        <Link
          href={`/pacientes/${residentId}/emergencia` as Route}
          className="flex min-h-11 items-center gap-2 self-start text-[15px] font-semibold text-destructive underline-offset-4 hover:underline"
        >
          <Siren aria-hidden="true" className="size-5" />
          ¿Está pasando ahora? Abrí la ficha de emergencia para llamar
        </Link>
      ) : null}
      {inactive ? (
        <Notice tone="warning">
          {name} no está activo/a: no se le puede registrar una emergencia.
        </Notice>
      ) : (
        <EmergencyForm
          residentId={residentId}
          defaults={{
            date: `${local.year}-${pad(local.month)}-${pad(local.day)}`,
            time: `${pad(local.hour)}:${pad(local.minute)}`,
          }}
        />
      )}
    </div>
  );
}
