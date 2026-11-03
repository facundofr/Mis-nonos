import type { Metadata, Route } from "next";

import { RecordEncounterLink, SpecialtyOverview } from "@/components/care/specialty-overview";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import {
  getNursingSpecialty,
  lastVisitsBySpecialty,
  listEncounters,
  listProfessionals,
  upcomingControls,
} from "@/features/care/queries";
import { inTenant } from "@/lib/actions";
import { can, requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";

export const metadata: Metadata = { title: "Enfermería" };

/**
 * Enfermería: las atenciones de enfermería (controles, curaciones), los
 * próximos controles de todas las especialidades y cuándo vio enfermería a
 * cada paciente por última vez.
 */
export default async function NursingPage({ searchParams }: PageProps<"/enfermeria">) {
  const context = await requirePermission("care.read");
  const { registrada } = await searchParams;
  const [{ site, today }, canRecord] = await Promise.all([
    getSiteContext(context),
    can(context, "care.record"),
  ]);
  const data = await inTenant(context, async (tx) => {
    const nursing = await getNursingSpecialty(tx);
    if (!nursing) return null;
    return {
      nursing,
      lastVisits: await lastVisitsBySpecialty(tx, { siteId: site.id, specialtyId: nursing.id }),
      encounters: await listEncounters(tx, {
        siteId: site.id,
        specialtyId: nursing.id,
        limit: 20,
      }),
      // Los controles de todas las especialidades: enfermería los coordina.
      controls: await upcomingControls(tx, { siteId: site.id, today }),
      professionals: await listProfessionals(tx, { activeOnly: true, specialtyId: nursing.id }),
    };
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader
        title="Enfermería"
        description="Controles, curaciones y lo que hace enfermería en cada turno."
      />
      {registrada ? <Notice tone="success">Atención de enfermería registrada.</Notice> : null}
      {!data ? (
        <Notice tone="warning">
          Falta la especialidad Enfermería. Pedile a Administración que revise las especialidades.
        </Notice>
      ) : (
        <>
          {canRecord ? (
            <RecordEncounterLink
              href={`/atenciones/nueva?especialidad=${data.nursing.id}&volver=enfermeria` as Route}
              label="Registrar atención de enfermería"
            />
          ) : null}
          <SpecialtyOverview
            specialtyName={data.nursing.name}
            lastVisits={data.lastVisits}
            encounters={data.encounters}
            controls={data.controls}
            professionals={data.professionals}
            timeZone={site.timezone}
            today={today}
          />
        </>
      )}
    </div>
  );
}
