import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { RecordEncounterLink, SpecialtyOverview } from "@/components/care/specialty-overview";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import {
  getSpecialty,
  lastVisitsBySpecialty,
  listEncounters,
  listProfessionals,
  upcomingControls,
} from "@/features/care/queries";
import { inTenant } from "@/lib/actions";
import { can, requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";

export const metadata: Metadata = { title: "Especialidad" };

export default async function SpecialtyPage({
  params,
  searchParams,
}: PageProps<"/especialidades/[id]">) {
  const context = await requirePermission("care.read");
  const { id } = await params;
  const { registrada } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const [{ site, today }, canRecord] = await Promise.all([
    getSiteContext(context),
    can(context, "care.record"),
  ]);
  const data = await inTenant(context, async (tx) => {
    const specialty = await getSpecialty(tx, id);
    if (!specialty) return null;
    return {
      specialty,
      lastVisits: await lastVisitsBySpecialty(tx, { siteId: site.id, specialtyId: id }),
      encounters: await listEncounters(tx, { siteId: site.id, specialtyId: id, limit: 20 }),
      controls: await upcomingControls(tx, { siteId: site.id, today, specialtyId: id }),
      professionals: await listProfessionals(tx, { activeOnly: true, specialtyId: id }),
    };
  });
  if (!data) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader
        title={data.specialty.name}
        description={data.specialty.active ? undefined : "Especialidad inactiva"}
        back={{ href: "/especialidades", label: "Especialidades" }}
      />
      {registrada ? <Notice tone="success">Atención registrada.</Notice> : null}
      {canRecord && data.specialty.active ? (
        <RecordEncounterLink
          href={`/atenciones/nueva?especialidad=${id}&volver=especialidad` as Route}
          label={`Registrar atención de ${data.specialty.name.toLocaleLowerCase("es-AR")}`}
        />
      ) : null}
      <SpecialtyOverview
        specialtyName={data.specialty.name}
        lastVisits={data.lastVisits}
        encounters={data.encounters}
        controls={data.controls}
        professionals={data.professionals}
        timeZone={site.timezone}
        today={today}
      />
    </div>
  );
}
