import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { listShifts } from "@/features/organizations/queries";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { formatTimeOfDay } from "@/lib/time/zoned";

import { ShiftForm } from "../settings-forms";

export const metadata: Metadata = { title: "Turnos" };

/** Turnos de la sede (7.3-B): arman el traspaso y el turno actual. */
export default async function ShiftsSettingsPage() {
  const context = await requirePermission("settings.manage");
  const { site } = await getSiteContext(context);
  const shifts = await inTenant(context, (tx) =>
    listShifts(tx, site.id, { includeInactive: true }),
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader
        title="Turnos"
        description="El turno actual sale del reloj y de estos horarios. Los activos no pueden superponerse; el turno noche puede cruzar la medianoche."
        back={{ href: "/configuracion", label: "Configuración" }}
      />
      <ul className="flex flex-col gap-3">
        {shifts.map((shift) => (
          <li key={shift.id}>
            <Card>
              <CardHeader
                title={shift.name}
                description={`${formatTimeOfDay(shift.startsAt)} a ${formatTimeOfDay(shift.endsAt)}`}
                action={shift.active ? undefined : <Badge>Inactivo</Badge>}
              />
              <details className="group px-5 py-3">
                <summary className="cursor-pointer text-sm font-medium text-primary-ink">
                  Editar
                </summary>
                <div className="pt-4">
                  <ShiftForm
                    shift={{
                      id: shift.id,
                      name: shift.name,
                      startsAt: formatTimeOfDay(shift.startsAt),
                      endsAt: formatTimeOfDay(shift.endsAt),
                      active: shift.active,
                    }}
                  />
                </div>
              </details>
            </Card>
          </li>
        ))}
      </ul>
      <Card>
        <CardHeader title="Agregar turno" />
        <div className="p-5">
          <ShiftForm />
        </div>
      </Card>
    </div>
  );
}
