import {
  ClipboardPen,
  FileDown,
  MapPin,
  Phone,
  ShieldCheck,
  Siren,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Avatar } from "@/components/ui/avatar";
import { buttonClassName } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { loadEmergencySheet } from "@/features/emergency/queries";
import { recordEmergencyView } from "@/features/emergency/service";
import { ageOn, formatNationalId, fullName, telHref } from "@/features/residents/format";
import { COVERAGE_TYPES } from "@/features/residents/schemas";
import { inTenant } from "@/lib/actions";
import { can, requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { formatTime } from "@/lib/time/format";

export const metadata: Metadata = { title: "Ficha de emergencia" };

// Tres pesos: el servicio de emergencias (rojo, el único rojo sólido), la
// primera llamada cuando no hay servicio (salmón, acción principal) y el resto.
const CALL_TONES = {
  emergency: {
    row: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    badge: "bg-white/20",
    muted: "opacity-90",
    action: "bg-white/20",
  },
  primary: {
    row: "bg-primary text-primary-foreground hover:bg-primary/90",
    badge: "bg-primary-foreground/10 font-semibold",
    muted: "opacity-80",
    action: "bg-primary-foreground/10",
  },
  default: {
    row: "border bg-card hover:bg-muted",
    badge: "bg-secondary font-semibold text-secondary-foreground",
    muted: "text-muted-foreground",
    action: "bg-secondary text-secondary-foreground",
  },
} as const;

function CallButton({
  href,
  icon: Icon,
  title,
  detail,
  phone,
  note,
  tone = "default",
  number,
  label,
}: {
  href: string;
  icon?: typeof Phone;
  /** Primera línea: a quién se llama. */
  title: string;
  /** Segunda línea: parentesco, rol o servicio. */
  detail?: string | null;
  /** El número, legible para dictarlo o marcarlo desde otro teléfono. */
  phone?: string | null;
  note?: string | null;
  tone?: keyof typeof CALL_TONES;
  number?: number;
  /** Nombre corto para lectores de pantalla ("Llamar a …"). */
  label: string;
}) {
  const styles = CALL_TONES[tone];
  return (
    <a
      href={href}
      aria-label={label}
      className={`flex min-h-16 items-center gap-3 rounded-[14px] px-4 py-3 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40 ${styles.row}`}
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-full ${styles.badge}`}
      >
        {number ?? (Icon ? <Icon aria-hidden="true" className="size-5" /> : null)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold">{title}</span>
        {detail ? <span className={`text-sm ${styles.muted}`}>{detail}</span> : null}
        {phone ? <span className="text-[15px] font-medium tabular-nums">{phone}</span> : null}
        {note ? <span className={`text-sm ${styles.muted}`}>{note}</span> : null}
      </span>
      {/* Se ve como botón: es la acción, no un dato más de la tarjeta. */}
      <span
        className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold ${styles.action}`}
      >
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
  const [{ site, today }, canConfigure, canRecord] = await Promise.all([
    getSiteContext(context),
    can(context, "settings.manage"),
    can(context, "emergencies.manage"),
  ]);

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
  // Sin servicio, qué hacer ahora según los teléfonos que sí hay en la ficha.
  const firstReachable = contacts.find(
    (contact) => contact.phoneMobile || contact.phonePrimary || contact.phoneWork,
  );
  const familyReachable = Boolean(firstReachable);
  // Sin servicio, la primera llamada posible pasa a ser la acción principal.
  const firstCallId = service.emergencyServicePhone ? null : (firstReachable?.id ?? null);
  const physicianReachable = Boolean(resident.primaryPhysicianPhone);
  const noServiceAction =
    familyReachable && physicianReachable
      ? "Llamá a la familia, en el orden de abajo, o al médico de cabecera. Después avisá a Administración."
      : familyReachable
        ? "Llamá a la familia, en el orden de abajo. Después avisá a Administración."
        : physicianReachable
          ? "Llamá al médico de cabecera (abajo). Después avisá a Administración."
          : "Esta ficha no tiene teléfonos cargados. Avisá a Administración.";
  const coverage = [
    COVERAGE_TYPES[resident.coverageType as keyof typeof COVERAGE_TYPES],
    resident.coverageName,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <Link
        href={`/pacientes/${id}` as Route}
        className="w-fit text-sm font-medium text-primary-ink underline-offset-4 hover:underline"
      >
        ‹ Ficha del paciente
      </Link>

      {/* La identidad se confirma de un vistazo: nombre grande y habitación. */}
      <header className="flex items-center gap-3">
        <Avatar name={name} size="lg" />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl leading-tight font-semibold tracking-tight">{name}</h1>
          <span className="text-[15px] text-muted-foreground">
            {[
              resident.roomLabel ? `Hab. ${resident.roomLabel}` : null,
              age !== null ? `${age} años` : null,
              resident.nationalId ? `DNI ${formatNationalId(resident.nationalId)}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-danger-surface px-2.5 py-0.5 text-xs font-semibold text-danger-surface-foreground">
            <Siren aria-hidden="true" className="size-3.5" />
            Ficha de emergencia
          </span>
        </div>
      </header>

      {resident.status === "hospitalized" ? (
        <p className="rounded-lg bg-info px-3.5 py-3 text-sm text-info-foreground">
          Internado/a fuera: {resident.hospitalizationPlace}.
        </p>
      ) : null}

      {/* El rojo solo cuando hay alergias: si no, un aviso neutro para confirmar. */}
      {allergies.length > 0 ? (
        <section
          aria-labelledby="alergias"
          className="flex flex-col gap-1.5 rounded-[14px] border-2 border-danger-border bg-danger-surface p-4 text-danger-surface-foreground"
        >
          <h2 id="alergias" className="flex items-start gap-2 text-lg leading-snug font-bold">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            {allergies.length === 1 ? "Alergia a " : "Alergias: "}
            {allergies.map((allergy) => allergy.substance.toLocaleLowerCase("es-AR")).join(", ")}
          </h2>
          {allergies
            .filter((allergy) => allergy.reaction || allergy.severity)
            .map((allergy) => (
              <p key={allergy.id} className="text-[15px]">
                {allergies.length > 1
                  ? `${allergy.substance}: `
                  : allergy.reaction
                    ? "Reacción: "
                    : "Gravedad: "}
                {[allergy.reaction, allergy.severity]
                  .filter(Boolean)
                  .map((value) => value!.toLocaleLowerCase("es-AR"))
                  .join(" · ")}
              </p>
            ))}
          {resident.specialInstructions ? (
            <p className="mt-1 border-t border-danger-border pt-2.5 text-[15px]">
              <span className="font-semibold">Indicaciones: </span>
              {resident.specialInstructions}
            </p>
          ) : null}
        </section>
      ) : (
        <section
          aria-labelledby="alergias"
          className="flex flex-col gap-1.5 rounded-[14px] border bg-card p-4"
        >
          <h2 id="alergias" className="font-semibold">
            No hay alergias cargadas
          </h2>
          <p className="text-sm text-muted-foreground">
            Si hay dudas, confirmá con la familia o el médico antes de dar medicación.
          </p>
          {resident.specialInstructions ? (
            <p className="mt-1 border-t pt-2.5 text-[15px]">
              <span className="font-semibold">Indicaciones: </span>
              {resident.specialInstructions}
            </p>
          ) : null}
        </section>
      )}

      <section aria-labelledby="a-quien-llamar" className="flex flex-col gap-2">
        <h2 id="a-quien-llamar" className="sr-only">
          A quién llamar
        </h2>
        {service.emergencyServicePhone ? (
          <CallButton
            href={telHref(service.emergencyServicePhone)}
            icon={Siren}
            tone="emergency"
            label={`Llamar a emergencias, ${service.emergencyServiceName ?? "servicio contratado"}, ${service.emergencyServicePhone}`}
            title={`Emergencias · ${service.emergencyServiceName ?? "servicio contratado"}`}
            detail={
              service.emergencyServiceAccount
                ? `Cliente N.º ${service.emergencyServiceAccount}`
                : null
            }
            phone={service.emergencyServicePhone}
          />
        ) : (
          // Sin servicio cargado no hay a quién mandar el botón rojo: se dice
          // claro qué hacer, y solo quien configura ve cómo resolverlo.
          <Notice tone="warning" className="text-[15px]">
            <p className="font-semibold">No hay servicio de emergencias cargado.</p>
            <p>{noServiceAction}</p>
            {canConfigure ? (
              <p className="mt-1.5 text-sm">
                Para que no vuelva a pasar: cargalo en{" "}
                <Link
                  href={"/configuracion/residencia" as Route}
                  className="font-medium underline underline-offset-4"
                >
                  Configuración › Residencia
                </Link>
                .
              </p>
            ) : null}
          </Notice>
        )}

        {/* Lo primero que pregunta quien atiende la llamada. */}
        <p className="flex items-start gap-2 rounded-[14px] border bg-card px-4 py-3 text-[15px]">
          <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span className="flex flex-col">
            <span className="text-xs text-muted-foreground">Dirección de la residencia</span>
            {service.address ? (
              <span className="font-semibold">{service.address}</span>
            ) : (
              <span className="text-muted-foreground">
                Sin dirección cargada
                {canConfigure ? (
                  <>
                    {" · "}
                    <Link
                      href={"/configuracion/residencia" as Route}
                      className="font-medium text-primary-ink underline underline-offset-4"
                    >
                      Cargarla
                    </Link>
                  </>
                ) : null}
              </span>
            )}
          </span>
        </p>

        <h2 className="mt-2 text-sm font-semibold">Familia, en este orden</h2>
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin contactos de emergencia cargados.</p>
        ) : (
          contacts.map((contact, index) => {
            // Sin repetir: el principal es el celular; los demás quedan como "Otro número".
            const phones = [
              ...new Set(
                [contact.phoneMobile, contact.phonePrimary, contact.phoneWork].filter(
                  (value): value is string => Boolean(value),
                ),
              ),
            ];
            const [phone, ...otherPhones] = phones;
            const detail = [
              contact.relationship,
              contact.isAdmissionResponsible ? "responsable" : null,
            ]
              .filter(Boolean)
              .join(" · ");
            // La numeración sigue el orden cargado aunque alguien no tenga teléfono.
            if (!phone) {
              return (
                <div
                  key={contact.id}
                  className="flex min-h-16 items-center gap-3 rounded-[14px] border border-dashed bg-card px-4 py-3"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-semibold">{contact.name}</span>
                    {detail ? (
                      <span className="text-sm text-muted-foreground">{detail}</span>
                    ) : null}
                    <span className="text-sm text-muted-foreground">Sin teléfono cargado</span>
                  </span>
                </div>
              );
            }
            return (
              <div key={contact.id} className="flex flex-col gap-1">
                <CallButton
                  href={telHref(phone)}
                  number={index + 1}
                  tone={contact.id === firstCallId ? "primary" : "default"}
                  label={`Llamar a ${[contact.name, ...detail.split(" · "), phone].filter(Boolean).join(", ")}`}
                  title={contact.name}
                  detail={detail}
                  phone={phone}
                  note={contact.availabilityNotes}
                />
                {otherPhones.length > 0 ? (
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-4 text-sm text-muted-foreground">
                    Otro número:
                    {otherPhones.map((other) => (
                      <a
                        key={other}
                        href={telHref(other)}
                        aria-label={`Llamar a ${contact.name} al ${other}`}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-md font-semibold text-primary-ink tabular-nums underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/40"
                      >
                        <Phone aria-hidden="true" className="size-4" />
                        {other}
                      </a>
                    ))}
                  </p>
                ) : null}
              </div>
            );
          })
        )}

        {resident.primaryPhysicianPhone ? (
          <CallButton
            href={telHref(resident.primaryPhysicianPhone)}
            icon={Stethoscope}
            tone={!firstCallId && !service.emergencyServicePhone ? "primary" : "default"}
            label={`Llamar al médico de cabecera${resident.primaryPhysicianName ? `, ${resident.primaryPhysicianName}` : ""}, ${resident.primaryPhysicianPhone}`}
            title={resident.primaryPhysicianName ?? "Médico de cabecera"}
            detail={resident.primaryPhysicianName ? "Médico de cabecera" : null}
            phone={resident.primaryPhysicianPhone}
          />
        ) : null}
      </section>

      <section
        aria-labelledby="cobertura"
        className="grid grid-cols-2 gap-3 rounded-[14px] border bg-card p-4"
      >
        <h2 id="cobertura" className="sr-only">
          Cobertura
        </h2>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Cobertura</span>
          {coverage ? (
            <span className="font-semibold">{coverage}</span>
          ) : (
            <span className="text-muted-foreground">Sin cobertura cargada</span>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">
            {resident.coverageType === "pami" ? "N.º de beneficiario" : "N.º de afiliado"}
          </span>
          {resident.coverageMemberNumber ? (
            <span className="font-semibold tabular-nums">{resident.coverageMemberNumber}</span>
          ) : (
            <span className="text-muted-foreground">Sin cargar</span>
          )}
        </div>
      </section>

      {/* Va después de las llamadas: sirve cuando llega la ambulancia. */}
      <a
        href={`/api/emergencia/${id}/hoja`}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClassName({
          variant: "outline",
          className: "h-auto min-h-12 py-2.5 whitespace-normal",
        })}
      >
        <FileDown aria-hidden="true" className="size-5 shrink-0" />
        <span className="flex flex-col items-start text-left leading-tight">
          <span>Hoja de derivación (PDF)</span>
          <span className="text-[13px] font-normal text-muted-foreground">
            Para entregar a la ambulancia
            <span className="sr-only"> (se abre en otra pestaña)</span>
          </span>
        </span>
      </a>
      {/* Después de llamar: deja asentado qué pasó (6.9, paso 5). */}
      {canRecord ? (
        <Link
          href={`/emergencias/nueva?paciente=${id}` as Route}
          className={buttonClassName({
            variant: "outline",
            className: "h-auto min-h-12 py-2.5 whitespace-normal",
          })}
        >
          <ClipboardPen aria-hidden="true" className="size-5 shrink-0" />
          <span className="flex flex-col items-start text-left leading-tight">
            <span>Registrar la emergencia</span>
            <span className="text-[13px] font-normal text-muted-foreground">
              Qué pasó, a quién se llamó y si hubo traslado
            </span>
          </span>
        </Link>
      ) : null}
      <p className="flex items-center justify-center gap-1.5 text-center text-[13px] text-balance text-muted-foreground">
        <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
        Queda registrado que abriste esta ficha · {formatTime(new Date(), site.timezone)}
      </p>
    </div>
  );
}
