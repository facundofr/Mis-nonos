import { ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatMoney } from "@/features/fees/money";
import { listMonthCharges } from "@/features/fees/queries";
import { CHARGE_STATUS_LABELS } from "@/features/fees/schemas";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { formatDateKey } from "@/lib/time/format";

import { PageTip } from "../guia/page-tip";
import { CHARGE_TONES } from "./resident-fees";

export const metadata: Metadata = { title: "Abonos" };

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function shiftMonth(month: string, delta: number): string {
  const [year, number] = month.split("-").map(Number) as [number, number];
  const index = year * 12 + (number - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[14px] border bg-card p-4">
      <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </div>
  );
}

/** Abonos del mes (7.3-C4; base: "Cuotas" de la fase 7): pagadas, pendientes y vencidas. */
export default async function FeesPage({ searchParams }: PageProps<"/abonos">) {
  const context = await requirePermission("fees.read");
  const params = await searchParams;
  const { site, today } = await getSiteContext(context);
  const month =
    typeof params.mes === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.mes)
      ? params.mes
      : today.slice(0, 7);
  const { items, totals } = await inTenant(context, (tx) =>
    listMonthCharges(tx, site.id, month, today),
  );
  const [year, number] = month.split("-").map(Number) as [number, number];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Abonos"
        description="Cuotas que vencen en el mes, con lo cobrado y lo que falta."
        back={{ href: "/mas", label: "Más" }}
      />
      <PageTip context={context} tip="abonos" />

      <nav aria-label="Mes" className="flex items-center justify-between gap-2">
        <Link
          href={`/abonos?mes=${shiftMonth(month, -1)}` as Route}
          aria-label="Mes anterior"
          className="flex size-11 items-center justify-center rounded-full border bg-card hover:bg-muted"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </Link>
        <h2 className="text-lg font-semibold first-letter:uppercase">
          {MONTHS[number - 1]} de {year}
        </h2>
        <Link
          href={`/abonos?mes=${shiftMonth(month, 1)}` as Route}
          aria-label="Mes siguiente"
          className="flex size-11 items-center justify-center rounded-full border bg-card hover:bg-muted"
        >
          <ChevronRight aria-hidden="true" className="size-5" />
        </Link>
      </nav>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Total label="A cobrar" value={formatMoney(totals.expected)} />
        <Total label="Cobrado" value={formatMoney(totals.collected)} />
        <Total label="Falta cobrar" value={formatMoney(totals.pending)} />
        <Total label="Vencidas" value={String(totals.overdue)} />
      </div>

      {items.length === 0 ? (
        <div className="rounded-[14px] border bg-card">
          <EmptyState icon={Wallet} title="Sin cuotas este mes">
            Las cuotas se generan solas con el abono de cada paciente.
          </EmptyState>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/pacientes/${item.residentId}?tab=abono` as Route}
                className="flex items-center justify-between gap-3 rounded-[14px] border bg-card p-4 hover:bg-muted/60"
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      {item.firstName} {item.lastName}
                    </span>
                    <Badge tone={CHARGE_TONES[item.status]}>
                      {CHARGE_STATUS_LABELS[item.status]}
                    </Badge>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Vence {formatDateKey(item.dueDate)}
                    {item.roomLabel ? ` · Hab. ${item.roomLabel}` : ""}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end tabular-nums">
                  <span className="font-semibold">{formatMoney(item.amount)}</span>
                  {item.status !== "paid" && item.balance !== item.amount ? (
                    <span className="text-[13px] text-muted-foreground">
                      saldo {formatMoney(item.balance)}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
