import { Phone, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { presentNow } from "@/features/attendance/queries";
import { listMembers, type MemberRow } from "@/features/users/queries";
import { inTenant } from "@/lib/actions";
import { can, requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { formatTime } from "@/lib/time/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Personal" };

function detailOf(member: MemberRow): string {
  const parts = [member.profession ?? member.roleName];
  if (member.licenseNumber) parts.push(`Mat. ${member.licenseNumber}`);
  if (member.usualShiftName)
    parts.push(`Turno ${member.usualShiftName.toLocaleLowerCase("es-AR")}`);
  return parts.join(" · ");
}

/**
 * Personal (diseño MovilEmpleados): cada empleado es un usuario con perfil
 * básico. Administración y Dirección ven, además, quién está en la
 * residencia según la asistencia con QR (docs/decisions/0020).
 */
function sinceLabel(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 === 0 ? `${hours} h` : `${hours} h ${minutes % 60} min`;
}

export default async function StaffPage({ searchParams }: PageProps<"/empleados">) {
  const context = await requirePermission("staff.read");
  const { filtro } = await searchParams;
  const [members, site, canAttendance] = await Promise.all([
    inTenant(context, (tx) => listMembers(tx)),
    getSiteContext(context),
    can(context, "attendance.read"),
  ]);
  const now = new Date();
  const present = canAttendance
    ? await inTenant(context, (tx) => presentNow(tx, site.site.id, now))
    : null;
  const showPresent = filtro === "adentro" && present !== null;
  const active = members.filter((member) => member.status === "active");
  const currentShiftId = site.current?.shift.id ?? null;
  const onShift = active.filter(
    (member) => currentShiftId && member.usualShiftId === currentShiftId,
  );
  const showOnShift = !showPresent && filtro === "turno" && currentShiftId !== null;
  const list = showOnShift ? onShift : active;

  const tabClass = (selected: boolean) =>
    cn(
      "flex h-10 items-center rounded-[9px] px-4 text-sm font-medium text-muted-foreground",
      selected && "bg-card font-semibold text-foreground shadow-xs",
    );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Personal" back={{ href: "/mas", label: "Más" }} />

      {currentShiftId || present ? (
        <nav
          aria-label="Filtro"
          className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1"
        >
          {present ? (
            <Link
              href="/empleados?filtro=adentro"
              aria-current={showPresent ? "page" : undefined}
              className={tabClass(showPresent)}
            >
              En la residencia · {present.length}
            </Link>
          ) : null}
          {currentShiftId ? (
            <Link
              href="/empleados?filtro=turno"
              aria-current={showOnShift ? "page" : undefined}
              className={tabClass(showOnShift)}
            >
              En turno ahora · {onShift.length}
            </Link>
          ) : null}
          <Link
            href="/empleados"
            aria-current={showOnShift || showPresent ? undefined : "page"}
            className={tabClass(!showOnShift && !showPresent)}
          >
            Todos · {active.length}
          </Link>
        </nav>
      ) : null}

      {showPresent && present ? (
        present.length === 0 ? (
          <div className="rounded-[14px] border bg-card">
            <EmptyState icon={UserRound} title="Nadie registró su entrada">
              Cada persona registra su entrada y su salida con el QR de la entrada (Configuración ›
              Asistencia con QR).
            </EmptyState>
          </div>
        ) : (
          <ul className="flex flex-col gap-2" aria-label="En la residencia">
            {present.map((person) => (
              <li
                key={person.userId}
                className="flex items-center gap-3 rounded-[14px] border bg-card p-3.5"
              >
                <Avatar name={person.name} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold">{person.name}</span>
                  <span className="truncate text-sm text-muted-foreground">
                    {person.roleName} · Entró {formatTime(person.enteredAt, site.site.timezone)} ·
                    hace {sinceLabel(now.getTime() - person.enteredAt.getTime())}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {showPresent ? null : list.length === 0 ? (
        <div className="rounded-[14px] border bg-card">
          <EmptyState icon={UserRound} title={showOnShift ? "Nadie en este turno" : "Sin personal"}>
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
        La entrada y la salida se registran con el QR de la entrada. Legajo y documentos del
        personal llegan más adelante.
      </p>
    </div>
  );
}
