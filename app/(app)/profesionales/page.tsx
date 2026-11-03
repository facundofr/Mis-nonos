import { ChevronRight, IdCard, Phone, Plus } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { listProfessionals, type ProfessionalRow } from "@/features/care/queries";
import { telHref } from "@/features/residents/format";
import { inTenant } from "@/lib/actions";
import { can, requirePermission } from "@/lib/auth/authorization";

export const metadata: Metadata = { title: "Profesionales" };

function detailOf(professional: ProfessionalRow): string {
  return [
    professional.kind === "internal" ? "De la residencia" : "Externo",
    professional.licenseNumber ? `Mat. ${professional.licenseNumber}` : null,
    professional.institution,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Profesionales (8.6, 5.10): médicos, kinesiólogos, enfermería y externos,
 * agrupados por especialidad, con su matrícula y el botón de llamar.
 */
export default async function ProfessionalsPage({ searchParams }: PageProps<"/profesionales">) {
  const context = await requirePermission("care.read");
  const params = await searchParams;
  const [professionals, canManage] = await Promise.all([
    inTenant(context, (tx) => listProfessionals(tx)),
    can(context, "care.manage"),
  ]);
  const active = professionals.filter((row) => row.active);
  const inactive = professionals.filter((row) => !row.active);
  const groups = new Map<string, ProfessionalRow[]>();
  for (const professional of active) {
    const list = groups.get(professional.specialtyName) ?? [];
    list.push(professional);
    groups.set(professional.specialtyName, list);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader
        title="Profesionales"
        description="Quiénes atienden a los pacientes, de la residencia y externos."
        actions={
          canManage ? (
            <Link href="/profesionales/nuevo" className={buttonClassName({ size: "md" })}>
              <Plus aria-hidden="true" className="size-5" />
              Agregar
            </Link>
          ) : null
        }
      />
      {params.agregado ? <Notice tone="success">Profesional agregado.</Notice> : null}
      {params.guardado ? <Notice tone="success">Cambios guardados.</Notice> : null}

      {active.length === 0 ? (
        <div className="rounded-[14px] border bg-card">
          <EmptyState icon={IdCard} title="Todavía no hay profesionales">
            {canManage
              ? "Agregá al médico de cabecera, a enfermería y a los profesionales externos que atienden a los pacientes."
              : "Administración o Dirección los agregan."}
          </EmptyState>
        </div>
      ) : (
        [...groups.entries()].map(([specialty, list]) => (
          <section key={specialty} aria-label={specialty} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">{specialty}</h2>
            <ul className="flex flex-col gap-2">
              {list.map((professional) => (
                <ProfessionalItem
                  key={professional.id}
                  professional={professional}
                  canManage={canManage}
                />
              ))}
            </ul>
          </section>
        ))
      )}

      {inactive.length > 0 ? (
        <details className="rounded-[14px] border bg-card">
          <summary className="flex h-12 cursor-pointer items-center px-4 text-[15px] font-medium">
            Inactivos · {inactive.length}
          </summary>
          <ul className="flex flex-col gap-2 p-3 pt-0">
            {inactive.map((professional) => (
              <ProfessionalItem
                key={professional.id}
                professional={professional}
                canManage={canManage}
              />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function ProfessionalItem({
  professional,
  canManage,
}: {
  professional: ProfessionalRow;
  canManage: boolean;
}) {
  const body = (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate font-semibold">{professional.name}</span>
      <span className="truncate text-sm text-muted-foreground">
        {professional.active ? detailOf(professional) : `${professional.specialtyName} · Inactivo`}
      </span>
    </span>
  );
  return (
    <li className="flex items-center gap-2 rounded-[14px] border bg-card p-2 pl-3.5">
      {canManage ? (
        <Link
          href={`/profesionales/${professional.id}` as Route}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
        >
          {body}
          <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
        </Link>
      ) : (
        <span className="flex min-h-11 min-w-0 flex-1 items-center">{body}</span>
      )}
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
  );
}
