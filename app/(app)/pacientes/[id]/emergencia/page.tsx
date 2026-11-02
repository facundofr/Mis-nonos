import { FileDown, Phone, ShieldCheck, Siren, Stethoscope, TriangleAlert } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Avatar } from "@/components/ui/avatar";
import { loadEmergencySheet } from "@/features/emergency/queries";
import { recordEmergencyView } from "@/features/emergency/service";
import { ageOn, formatNationalId, fullName, telHref } from "@/features/residents/format";
import { COVERAGE_TYPES } from "@/features/residents/schemas";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { formatTime } from "@/lib/time/format";

export const metadata: Metadata = { title: "Ficha de emergencia" };

function CallButton({
  href,
  icon: Icon,
  title,
  subtitle,
  prominent = false,
  number,
}: {
  href: string;
  icon?: typeof Phone;
  title: string;
  subtitle?: string | null;
  prominent?: boolean;
  number?: number;
}) {
  return (
    <a
      href={href}
      className={
        prominent
          ? "flex min-h-16 items-center gap-3 rounded-[14px] bg-destructive px-4 py-3 text-destructive-foreground"
          : "flex min-h-16 items-center gap-3 rounded-[14px] border bg-card px-4 py-3"
      }
    >
      <span
        className={
          prominent
            ? "flex size-10 shrink-0 items-center justify-center rounded-full bg-white/20"
            : "flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-secondary-foreground"
        }
      >
        {number ?? (Icon ? <Icon aria-hidden="true" className="size-5" /> : null)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold">{title}</span>
        {subtitle ? (
          <span className={prominent ? "text-sm opacity-90" : "text-sm text-muted-foreground"}>
            {subtitle}
          </span>
        ) : null}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold">
        <Phone aria-hidden="true" className="size-5" />
        Llamar
      </span>
    </a>
  );
}

/**
 * Ficha de emergencia (7.3-E, 6.9, 13.5; diseño Emergencia): una sola
 * pantalla, botones "Llamar" grandes, alergias con texto y color. La ve
 * todo el personal activo; cada apertura queda auditada y avisa a
 * Dirección (DC-02).
 */
export default async function EmergencyPage({ params }: PageProps<"/pacientes/[id]/emergencia">) {
  const context = await requirePermission("emergency.view");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { site, today } = await getSiteContext(context);

  const sheet = await inTenant(context, async (tx) => {
    const loaded = await loadEmergencySheet(tx, id);
    if (loaded) await recordEmergencyView(tx, context.tenant, loaded.resident);
    return loaded;
  });
  if (!sheet) notFound();
  const { resident, allergies, contacts } = sheet;
  const name = fullName(resident);
  const age = ageOn(resident.birthDate, today);
  const service = sheet.site;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <Link
        href={`/pacientes/${id}` as Route}
        className="w-fit text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        ‹ Ficha del paciente
      </Link>

      <header className="flex items-center gap-3">
        <Avatar name={name} size="lg" />
        <div className="flex min-w-0 flex-col">
          <span className="text-xs font-semibold tracking-wide text-destructive uppercase">
            Ficha de emergencia
          </span>
          <h1 className="text-xl font-semibold tracking-tight">{name}</h1>
          <span className="text-sm text-muted-foreground">
            {[
              resident.roomLabel ? `Hab. ${resident.roomLabel}` : null,
              age !== null ? `${age} años` : null,
              resident.nationalId ? `DNI ${formatNationalId(resident.nationalId)}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
      </header>

      {resident.status === "hospitalized" ? (
        <p className="rounded-lg bg-info px-3.5 py-3 text-sm text-info-foreground">
          Internado/a fuera: {resident.hospitalizationPlace}.
        </p>
      ) : null}

      <section
        aria-label="Alergias e indicaciones"
        className="flex flex-col gap-1.5 rounded-[14px] border-2 border-danger-border bg-danger-surface p-4 text-danger-surface-foreground"
      >
        <span className="flex items-center gap-2 text-lg font-bold">
          <TriangleAlert aria-hidden="true" className="size-5" />
          {allergies.length > 0
            ? `Alergia a ${allergies
                .map(
                  (allergy) =>
                    `${allergy.substance.toLocaleLowerCase("es-AR")}${allergy.reaction ? ` (${allergy.reaction})` : ""}`,
                )
                .join(", ")}`
            : "Sin alergias registradas"}
        </span>
        {resident.specialInstructions ? (
          <span className="text-[15px]">{resident.specialInstructions}</span>
        ) : null}
      </section>

      <section aria-label="A quién llamar" className="flex flex-col gap-2">
        {service.emergencyServicePhone ? (
          <CallButton
            href={telHref(service.emergencyServicePhone)}
            icon={Siren}
            prominent
            title={`Emergencias · ${service.emergencyServiceName ?? "servicio contratado"}`}
            subtitle={
              service.emergencyServiceAccount
                ? `Cliente N.º ${service.emergencyServiceAccount} · ${service.emergencyServicePhone}`
                : service.emergencyServicePhone
            }
          />
        ) : (
          <p className="rounded-lg bg-warning px-3.5 py-3 text-sm text-warning-foreground">
            Falta cargar el servicio de emergencias en Configuración.
          </p>
        )}

        <h2 className="mt-2 text-sm font-semibold">Familia, en este orden</h2>
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin contactos de emergencia cargados.</p>
        ) : (
          contacts.map((contact, index) => {
            const phone = contact.phoneMobile ?? contact.phonePrimary ?? contact.phoneWork;
            const detail = [
              contact.relationship?.toLocaleLowerCase("es-AR"),
              contact.isAdmissionResponsible ? "responsable" : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return phone ? (
              <CallButton
                key={contact.id}
                href={telHref(phone)}
                number={index + 1}
                title={`${contact.name}${detail ? ` · ${detail}` : ""}`}
                subtitle={[phone, contact.availabilityNotes].filter(Boolean).join(" · ")}
              />
            ) : null;
          })
        )}

        {resident.primaryPhysicianPhone ? (
          <CallButton
            href={telHref(resident.primaryPhysicianPhone)}
            icon={Stethoscope}
            title={resident.primaryPhysicianName ?? "Médico de cabecera"}
            subtitle={`Médico de cabecera · ${resident.primaryPhysicianPhone}`}
          />
        ) : null}
      </section>

      <section
        aria-label="Cobertura"
        className="grid grid-cols-2 gap-3 rounded-[14px] border bg-card p-4"
      >
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Cobertura</span>
          <span className="font-semibold">
            {[
              COVERAGE_TYPES[resident.coverageType as keyof typeof COVERAGE_TYPES],
              resident.coverageName,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">
            {resident.coverageType === "pami" ? "N.º de beneficiario" : "N.º de afiliado"}
          </span>
          <span className="font-semibold">{resident.coverageMemberNumber ?? "—"}</span>
        </div>
      </section>

      <a
        href={`/api/emergencia/${id}/hoja`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary text-[15px] font-medium text-primary-foreground"
      >
        <FileDown aria-hidden="true" className="size-5" />
        Hoja de derivación (PDF)
      </a>
      <p className="flex items-center justify-center gap-1.5 text-center text-[13px] text-muted-foreground">
        <ShieldCheck aria-hidden="true" className="size-4" />
        Apertura registrada · {context.user.name} · {formatTime(new Date(), site.timezone)}
      </p>
    </div>
  );
}
