import { CircleCheck, Clock, LogIn, LogOut, QrCode } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { recentRecords } from "@/features/attendance/queries";
import { isInside, sameToken, TOKEN_PATTERN } from "@/features/attendance/rules";
import { INVALID_TOKEN_MESSAGE } from "@/features/attendance/service";
import { inTenant } from "@/lib/actions";
import { signOutAction } from "@/lib/auth/actions";
import { requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { formatTime, formatWhen } from "@/lib/time/format";

import { AttendanceButton } from "../attendance-button";

export const metadata: Metadata = { title: "Asistencia" };

/**
 * Lo que abre el QR de la entrada (docs/decisions/0020). Abrir el enlace no
 * registra nada: hace falta tocar el botón, así una vista previa o una
 * recarga no marcan una entrada.
 */
export default async function AttendancePage({
  params,
  searchParams,
}: PageProps<"/fichar/[token]">) {
  const context = await requirePermission("attendance.record");
  const [{ token }, { listo }] = await Promise.all([params, searchParams]);
  const { site } = await getSiteContext(context);
  const valid = TOKEN_PATTERN.test(token) && sameToken(site.attendanceToken, token);
  const firstName = context.user.name.split(" ")[0] || context.user.name;
  const now = new Date();

  if (!valid) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        <h1 className="text-2xl font-semibold tracking-tight">Asistencia</h1>
        <Notice tone="error">
          <p className="font-semibold">{INVALID_TOKEN_MESSAGE}</p>
          <p>Administración lo cambió. Escaneá el QR que está pegado en la entrada.</p>
        </Notice>
        <Link href="/inicio" className={buttonClassName({ variant: "outline" })}>
          Ir al inicio
        </Link>
      </div>
    );
  }

  const records = await inTenant(context, (tx) =>
    recentRecords(tx, { siteId: site.id, userId: context.user.id, limit: 3 }),
  );
  const last = records[0] ?? null;
  const inside = isInside(last, now);
  const done = listo === "entrada" || listo === "salida" ? listo : null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div className="flex flex-col gap-1">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-ink">
          <QrCode aria-hidden="true" className="size-4" />
          Asistencia · {site.name}
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">
          {done ? "Listo" : inside ? "Registrá tu salida" : "Registrá tu entrada"}
        </h1>
      </div>

      <section
        aria-label="Quién registra"
        className="flex items-center gap-3 rounded-[14px] border bg-card p-4"
      >
        <Avatar name={context.user.name} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-lg font-semibold">{context.user.name}</span>
          <span className="truncate text-sm text-muted-foreground">
            {context.membership.roleName}
          </span>
        </div>
      </section>

      {done && last ? (
        <div
          role="status"
          className="flex flex-col items-center gap-2 rounded-[14px] bg-success p-6 text-center text-success-foreground"
        >
          <CircleCheck aria-hidden="true" className="size-10" />
          <p className="text-xl font-semibold">
            {done === "entrada" ? "Entrada" : "Salida"} registrada a las{" "}
            {formatTime(last.occurredAt, site.timezone)}
          </p>
          <p className="text-[15px]">
            {done === "entrada" ? `¡Buen turno, ${firstName}!` : `¡Hasta la próxima, ${firstName}!`}
          </p>
        </div>
      ) : (
        <>
          <p className="flex items-center gap-2 text-[15px] text-muted-foreground">
            <Clock aria-hidden="true" className="size-4" />
            {inside && last
              ? `Entraste a las ${formatTime(last.occurredAt, site.timezone)}. Ahora son las ${formatTime(now, site.timezone)}.`
              : `Son las ${formatTime(now, site.timezone)}. Se registra la hora de este momento.`}
          </p>
          <AttendanceButton token={token} kind={inside ? "out" : "in"} />
          <form action={signOutAction} className="text-center text-sm text-muted-foreground">
            ¿No sos {firstName}?{" "}
            <button
              type="submit"
              className="font-medium text-primary-ink underline underline-offset-4"
            >
              Cerrá esta sesión
            </button>{" "}
            y entrá con tu usuario.
          </form>
        </>
      )}

      {records.length > 0 ? (
        <Card aria-labelledby="ultimos">
          <CardHeader id="ultimos" title="Tus últimos registros" />
          <ul className="divide-y">
            {records.map((record) => {
              const Icon = record.kind === "in" ? LogIn : LogOut;
              return (
                <li key={record.id} className="flex items-center gap-3 px-5 py-3 text-[15px]">
                  <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
                  <span className="flex-1">{record.kind === "in" ? "Entrada" : "Salida"}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatWhen(record.occurredAt, now, site.timezone)}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      {done ? (
        <Link href="/inicio" className={buttonClassName({ variant: "outline" })}>
          Ir al inicio
        </Link>
      ) : null}
    </div>
  );
}
