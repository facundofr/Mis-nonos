import { ChevronRight, Plus, Siren } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { listEmergencies } from "@/features/care/queries";
import { fullName } from "@/features/residents/format";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { formatWhen } from "@/lib/time/format";

export const metadata: Metadata = { title: "Emergencias" };

/**
 * Registro de emergencias (6.9, paso 5): primero las abiertas. Para llamar
 * en el momento está la ficha de emergencia de cada paciente.
 */
export default async function EmergenciesPage() {
  const context = await requirePermission("emergencies.manage");
  const { site } = await getSiteContext(context);
  const emergencies = await inTenant(context, (tx) =>
    listEmergencies(tx, { siteId: site.id, limit: 50 }),
  );
  const open = emergencies.filter((row) => row.status === "open");
  const closed = emergencies.filter((row) => row.status !== "open");
  const now = new Date();

  const item = (row: (typeof emergencies)[number]) => (
    <li key={row.id}>
      <Link
        href={`/emergencias/${row.id}` as Route}
        className="flex items-center gap-3 rounded-[14px] border bg-card p-3.5 hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold">
              {fullName({ firstName: row.residentFirstName, lastName: row.residentLastName })}
            </span>
            {row.status === "open" ? (
              <Badge tone="danger">Abierta</Badge>
            ) : (
              <Badge tone="neutral">Cerrada</Badge>
            )}
            {row.transferred ? <Badge tone="warning">Con traslado</Badge> : null}
          </span>
          <span className="line-clamp-2 text-[15px]">{row.description}</span>
          <span className="text-sm text-muted-foreground">
            {formatWhen(row.startedAt, now, site.timezone)} · {row.authorName}
          </span>
        </span>
        <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader
        title="Emergencias"
        description="Lo que pasó, a quién se llamó y si hubo traslado."
      />
      <Link
        href="/emergencias/nueva"
        className={buttonClassName({ size: "lg", variant: "destructive" })}
      >
        <Plus aria-hidden="true" className="size-5" />
        Registrar emergencia
      </Link>
      <p className="text-[13px] leading-snug text-muted-foreground">
        Si la urgencia está pasando ahora, primero llamá desde la ficha de emergencia del paciente.
        Esto se completa después.
      </p>

      {emergencies.length === 0 ? (
        <div className="rounded-[14px] border bg-card">
          <EmptyState icon={Siren} title="Sin emergencias registradas" />
        </div>
      ) : (
        <>
          {open.length > 0 ? (
            <section aria-labelledby="abiertas" className="flex flex-col gap-2">
              <h2 id="abiertas" className="text-lg font-semibold">
                Abiertas · {open.length}
              </h2>
              <ul className="flex flex-col gap-2">{open.map(item)}</ul>
            </section>
          ) : null}
          {closed.length > 0 ? (
            <section aria-labelledby="cerradas" className="flex flex-col gap-2">
              <h2 id="cerradas" className="text-lg font-semibold">
                Cerradas
              </h2>
              <ul className="flex flex-col gap-2">{closed.map(item)}</ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
