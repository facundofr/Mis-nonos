import { ChevronRight, ClipboardList, ClipboardPlus } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { listAdmissionsInProgress } from "@/features/residents/queries";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { formatDateTime } from "@/lib/time/format";

import { STEPS, stepHref } from "./_shared";
import { PageTip } from "../guia/page-tip";

export const metadata: Metadata = { title: "Ingresos en curso" };

/** Ingresos en curso (F.4): los borradores se retoman desde acá. */
export default async function AdmissionsPage({ searchParams }: PageProps<"/ingresos">) {
  const context = await requirePermission("admissions.manage");
  const { cancelado } = await searchParams;
  const [{ site }, admissions] = await Promise.all([
    getSiteContext(context),
    inTenant(context, (tx) => listAdmissionsInProgress(tx)),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Ingresos en curso"
        description="Los ingresos que se empezaron y todavía no se confirmaron. No aparecen entre los pacientes."
        back={{ href: "/pacientes", label: "Pacientes" }}
        actions={
          <Link href="/ingresos/nuevo" className={buttonClassName({ size: "md" })}>
            <ClipboardPlus aria-hidden="true" className="size-4" />
            Nuevo ingreso
          </Link>
        }
      />
      <PageTip context={context} tip="ingresos" />
      {cancelado ? (
        <Notice tone="info">Ingreso cancelado. Queda registrado en la auditoría.</Notice>
      ) : null}
      {admissions.length === 0 ? (
        <div className="rounded-[14px] border bg-card">
          <EmptyState icon={ClipboardList} title="No hay ingresos en curso">
            Cuando empiezes un ingreso y lo dejes a medias, lo retomás desde acá.
          </EmptyState>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {admissions.map((admission) => {
            const next = Math.min(admission.currentStep + 1, 4);
            return (
              <li key={admission.admissionId}>
                <Link
                  href={stepHref(admission.admissionId, next) as Route}
                  className="flex items-center gap-3 rounded-[14px] border bg-card p-4 hover:bg-muted/60"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-semibold">
                      {admission.firstName} {admission.lastName}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Sigue en: {STEPS[next - 1]!.label} · Empezado{" "}
                      {formatDateTime(admission.createdAt, site.timezone)}
                      {admission.createdByName ? ` por ${admission.createdByName}` : ""}
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
