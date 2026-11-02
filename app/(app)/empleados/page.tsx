import { Phone, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { listMembers, type MemberRow } from "@/features/users/queries";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Empleados" };

function detailOf(member: MemberRow): string {
  const parts = [member.profession ?? member.roleName];
  if (member.licenseNumber) parts.push(`Mat. ${member.licenseNumber}`);
  if (member.usualShiftName)
    parts.push(`Turno ${member.usualShiftName.toLocaleLowerCase("es-AR")}`);
  return parts.join(" · ");
}

/**
 * Empleados (diseño MovilEmpleados). En el MVP cada empleado es un usuario
 * con perfil básico; legajo, documentos y turnos llegan en la fase 5.
 */
export default async function StaffPage({ searchParams }: PageProps<"/empleados">) {
  const context = await requirePermission("staff.read");
  const { filtro } = await searchParams;
  const [members, site] = await Promise.all([
    inTenant(context, (tx) => listMembers(tx)),
    getSiteContext(context),
  ]);
  const active = members.filter((member) => member.status === "active");
  const currentShiftId = site.current?.shift.id ?? null;
  const onShift = active.filter(
    (member) => currentShiftId && member.usualShiftId === currentShiftId,
  );
  const showOnShift = filtro === "turno" && currentShiftId !== null;
  const list = showOnShift ? onShift : active;

  const tabClass = (selected: boolean) =>
    cn(
      "flex h-10 items-center rounded-[9px] px-4 text-sm font-medium text-muted-foreground",
      selected && "bg-card font-semibold text-foreground shadow-xs",
    );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Empleados" back={{ href: "/mas", label: "Más" }} />

      {currentShiftId ? (
        <nav aria-label="Filtro" className="flex w-fit gap-1 rounded-xl bg-muted p-1">
          <Link
            href="/empleados?filtro=turno"
            aria-current={showOnShift ? "page" : undefined}
            className={tabClass(showOnShift)}
          >
            En turno ahora · {onShift.length}
          </Link>
          <Link
            href="/empleados"
            aria-current={showOnShift ? undefined : "page"}
            className={tabClass(!showOnShift)}
          >
            Todos · {active.length}
          </Link>
        </nav>
      ) : null}

      {list.length === 0 ? (
        <div className="rounded-[14px] border bg-card">
          <EmptyState
            icon={UserRound}
            title={showOnShift ? "Nadie en este turno" : "Sin empleados"}
          >
            {showOnShift
              ? "Nadie tiene este turno como habitual. Administración lo carga en la ficha de cada persona."
              : "Todavía no hay personal activo."}
          </EmptyState>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((member) => (
            <li
              key={member.membershipId}
              className="flex items-center gap-3 rounded-[14px] border bg-card p-3.5"
            >
              <Avatar name={member.name} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold">{member.name}</span>
                <span className="truncate text-sm text-muted-foreground">{detailOf(member)}</span>
              </div>
              {member.phone ? (
                <a
                  href={`tel:${member.phone.replace(/[^\d+]/g, "")}`}
                  aria-label={`Llamar a ${member.name}`}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
                >
                  <Phone aria-hidden="true" className="size-5" />
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <p className="text-[13px] leading-snug text-muted-foreground">
        En esta etapa cada empleado es un usuario con perfil básico. Legajo, documentos y turnos
        llegan más adelante.
      </p>
    </div>
  );
}
