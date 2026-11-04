import { MessageCircle, Pencil, Phone, Siren, TriangleAlert } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { ActivityList } from "@/components/activity/activity-list";
import { DocumentChecklist } from "@/components/documents/document-checklist";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { listEntityActivity } from "@/features/activity/queries";
import { listResidentDocuments } from "@/features/documents/queries";
import {
  ageOn,
  formatNationalId,
  fullName,
  STATUS_LABELS,
  telHref,
  whatsappHref,
} from "@/features/residents/format";
import {
  getResident,
  listAllergies,
  listContacts,
  type ContactRow,
} from "@/features/residents/queries";
import { COVERAGE_TYPES, DISCHARGE_REASONS, MODALITIES } from "@/features/residents/schemas";
import { listDocumentTypes } from "@/features/settings/queries";
import { inTenant } from "@/lib/actions";
import { getPermissions, requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { formatDateKey } from "@/lib/time/format";
import { cn } from "@/lib/utils";

import { AllergyForm, DiscardAllergyButton } from "../resident-forms";
import { PageTip } from "../../guia/page-tip";

export const metadata: Metadata = { title: "Ficha del paciente" };

const TABS = [
  { key: "resumen", label: "Resumen" },
  { key: "contactos", label: "Contactos" },
  { key: "legajo", label: "Legajo" },
  { key: "actividad", label: "Actividad", permission: "audit.read_resident" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid gap-0.5 py-2.5 sm:grid-cols-[13rem_1fr] sm:gap-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-[15px]">{value || "—"}</dd>
    </div>
  );
}

function ContactCard({
  contact,
  residentId,
  canManage,
}: {
  contact: ContactRow;
  residentId: string;
  canManage: boolean;
}) {
  const phone = contact.phoneMobile ?? contact.phonePrimary ?? contact.phoneWork;
  const roles = [
    contact.isAdmissionResponsible ? "Responsable de la internación" : null,
    contact.isLegalRepresentative ? "Referente legal" : null,
  ].filter(Boolean);
  return (
    <li className="flex items-center gap-3 px-5 py-3.5">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold">
          {contact.emergencyPriority ? `${contact.emergencyPriority}. ` : ""}
          {contact.name}
          {contact.relationship ? (
            <span className="font-normal text-muted-foreground">
              {" "}
              · {contact.relationship.toLocaleLowerCase("es-AR")}
            </span>
          ) : null}
        </span>
        <span className="text-sm text-muted-foreground">
          {[phone, ...roles].filter(Boolean).join(" · ")}
        </span>
        {contact.availabilityNotes ? (
          <span className="text-[13px] text-muted-foreground">{contact.availabilityNotes}</span>
        ) : null}
        {canManage ? (
          <Link
            href={`/pacientes/${residentId}/contactos/${contact.id}` as Route}
            className="w-fit text-sm font-medium text-primary-ink underline-offset-4 hover:underline"
          >
            Editar
          </Link>
        ) : null}
      </span>
      {contact.whatsapp && contact.phoneMobile ? (
        <a
          href={whatsappHref(contact.phoneMobile)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`WhatsApp a ${contact.name}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border bg-card"
        >
          <MessageCircle aria-hidden="true" className="size-5" />
        </a>
      ) : null}
      {phone ? (
        <a
          href={telHref(phone)}
          aria-label={`Llamar a ${contact.name}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <Phone aria-hidden="true" className="size-5" />
        </a>
      ) : null}
    </li>
  );
}

/** Ficha del paciente (diseños MovilFicha y Ficha, con las pestañas de F.7). */
export default async function ResidentPage({ params, searchParams }: PageProps<"/pacientes/[id]">) {
  const context = await requirePermission("residents.read");
  const { id } = await params;
  const query = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();

  const [permissions, { site, today }] = await Promise.all([
    getPermissions(context),
    getSiteContext(context),
  ]);
  const tabs = TABS.filter((tab) => !("permission" in tab) || permissions.has(tab.permission));
  const tab: TabKey = tabs.some((item) => item.key === query.tab)
    ? (query.tab as TabKey)
    : "resumen";

  const data = await inTenant(context, async (tx) => {
    const resident = await getResident(tx, id);
    if (
      !resident ||
      resident.status === "admission_draft" ||
      resident.status === "admission_cancelled"
    ) {
      return null;
    }
    return {
      resident,
      allergies: await listAllergies(tx, id),
      contacts: await listContacts(tx, id),
      activity: tab === "actividad" ? await listEntityActivity(tx, { type: "resident", id }) : [],
      documentTypes: tab === "legajo" ? await listDocumentTypes(tx) : [],
      documents: tab === "legajo" ? await listResidentDocuments(tx, id) : new Map(),
    };
  });
  if (!data) notFound();
  const { resident, allergies, contacts, activity, documentTypes, documents } = data;
  const name = fullName(resident);
  const age = ageOn(resident.birthDate, today);
  const canUpdate = permissions.has("residents.update");
  const canContacts = permissions.has("contacts.manage");
  const canStatus = permissions.has("residents.status") || permissions.has("residents.discharge");
  const discharged = resident.status === "discharged";

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/pacientes"
        className="w-fit text-sm font-medium text-primary-ink underline-offset-4 hover:underline"
      >
        ‹ Pacientes
      </Link>

      <PageTip context={context} tip="ficha" />
      {query.ingreso === "confirmado" ? (
        <Notice tone="success">
          Ingreso confirmado. {name} ya figura entre los pacientes activos.
        </Notice>
      ) : null}
      {query.guardado ? <Notice tone="success">Los datos quedaron guardados.</Notice> : null}

      <header className="flex flex-col gap-3 rounded-[14px] border bg-card p-4">
        <div className="flex items-center gap-3">
          <Avatar name={name} size="lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight">{name}</h1>
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <Badge
                tone={
                  resident.status === "active"
                    ? "success"
                    : resident.status === "hospitalized"
                      ? "info"
                      : "neutral"
                }
              >
                {STATUS_LABELS[resident.status as keyof typeof STATUS_LABELS]}
              </Badge>
              {resident.roomLabel ? <span>Hab. {resident.roomLabel}</span> : null}
              {age !== null ? <span>· {age} años</span> : null}
              <span>· {resident.admissionModality === "pami" ? "PAMI" : "Privado"}</span>
            </div>
          </div>
        </div>
        {resident.status === "hospitalized" ? (
          <Notice tone="info">
            Internado/a en {resident.hospitalizationPlace} desde{" "}
            {resident.hospitalizedSince ? formatDateKey(resident.hospitalizedSince) : "—"}.
          </Notice>
        ) : null}
        {discharged ? (
          <Notice tone="warning">
            Egresó el {resident.dischargeDate ? formatDateKey(resident.dischargeDate) : "—"} (
            {DISCHARGE_REASONS[resident.dischargeReason as keyof typeof DISCHARGE_REASONS]}). Sus
            datos se conservan.
          </Notice>
        ) : null}
        {allergies.length > 0 || resident.specialInstructions ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-danger-border bg-danger-surface px-3.5 py-3 text-sm text-danger-surface-foreground">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>
              {allergies.length > 0 ? (
                <b>
                  Alergia a{" "}
                  {allergies
                    .map((allergy) => allergy.substance.toLocaleLowerCase("es-AR"))
                    .join(", ")}
                  .{" "}
                </b>
              ) : null}
              {resident.specialInstructions}
            </p>
          </div>
        ) : null}
        {!discharged && permissions.has("emergency.view") ? (
          <Link
            href={`/pacientes/${id}/emergencia` as Route}
            prefetch={false}
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-destructive text-[15px] font-semibold text-destructive-foreground"
          >
            <Siren aria-hidden="true" className="size-5" />
            Emergencia
          </Link>
        ) : null}
        {!discharged && (canUpdate || canStatus) ? (
          <div className="flex flex-wrap gap-2">
            {canUpdate ? (
              <Link
                href={`/pacientes/${id}/editar` as Route}
                className={buttonClassName({ variant: "outline", size: "md" })}
              >
                <Pencil aria-hidden="true" className="size-4" />
                Editar datos
              </Link>
            ) : null}
            {canStatus ? (
              <Link
                href={`/pacientes/${id}/estado` as Route}
                className={buttonClassName({ variant: "outline", size: "md" })}
              >
                Internación o egreso
              </Link>
            ) : null}
          </div>
        ) : null}
      </header>

      <nav
        aria-label="Secciones de la ficha"
        className="-mx-1 flex gap-1 overflow-x-auto border-b px-1"
      >
        {tabs.map((item) => (
          <Link
            key={item.key}
            href={
              (item.key === "resumen"
                ? `/pacientes/${id}`
                : `/pacientes/${id}?tab=${item.key}`) as Route
            }
            aria-current={tab === item.key ? "page" : undefined}
            className={cn(
              "-mb-px flex h-11 shrink-0 items-center border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground",
              tab === item.key && "border-primary-ink font-semibold text-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {tab === "resumen" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Datos personales" />
            <dl className="divide-y px-5 py-1">
              <Row label="DNI" value={formatNationalId(resident.nationalId)} />
              <Row
                label="Nacimiento"
                value={
                  resident.birthDate
                    ? `${formatDateKey(resident.birthDate)}${age !== null ? ` (${age} años)` : ""}`
                    : null
                }
              />
              <Row label="Lugar de nacimiento" value={resident.birthPlace} />
              <Row label="Domicilio anterior" value={resident.previousAddress} />
              <Row
                label="Ingreso"
                value={resident.admissionDate ? formatDateKey(resident.admissionDate) : null}
              />
              <Row label="Institución que lo deriva" value={resident.referralInstitution} />
            </dl>
          </Card>
          <Card>
            <CardHeader title="Cobertura y médico" />
            <dl className="divide-y px-5 py-1">
              <Row
                label="Modalidad"
                value={MODALITIES[resident.admissionModality as keyof typeof MODALITIES]}
              />
              <Row
                label="Cobertura"
                value={[
                  COVERAGE_TYPES[resident.coverageType as keyof typeof COVERAGE_TYPES],
                  resident.coverageName,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
              <Row
                label={resident.coverageType === "pami" ? "N.º de beneficiario" : "N.º de afiliado"}
                value={resident.coverageMemberNumber}
              />
              <Row label="DNI en custodia" value={resident.nationalIdInCustody ? "Sí" : "No"} />
              <Row
                label="Médico de cabecera"
                value={[resident.primaryPhysicianName, resident.primaryPhysicianPhone]
                  .filter(Boolean)
                  .join(" · ")}
              />
            </dl>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader title="Alergias" />
            <div className="flex flex-col gap-4 p-5">
              {allergies.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin alergias registradas.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {allergies.map((allergy) => (
                    <li
                      key={allergy.id}
                      className="flex items-center gap-1 rounded-full bg-danger-surface py-1 pr-1 pl-3 text-sm text-danger-surface-foreground"
                    >
                      <span>
                        <b>{allergy.substance}</b>
                        {allergy.reaction ? ` · ${allergy.reaction}` : ""}
                        {allergy.severity ? ` · ${allergy.severity}` : ""}
                      </span>
                      {canUpdate && !discharged ? (
                        <DiscardAllergyButton
                          residentId={id}
                          allergyId={allergy.id}
                          substance={allergy.substance}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              {canUpdate && !discharged ? <AllergyForm residentId={id} /> : null}
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "contactos" ? (
        <Card>
          <CardHeader
            title="Contactos"
            description="En el orden en que hay que llamarlos en una emergencia."
            action={
              canContacts && !discharged ? (
                <Link
                  href={`/pacientes/${id}/contactos/nuevo` as Route}
                  className={buttonClassName({ size: "md", variant: "outline" })}
                >
                  Agregar
                </Link>
              ) : undefined
            }
          />
          {contacts.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">Sin contactos cargados.</p>
          ) : (
            <ul className="divide-y">
              {contacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  residentId={id}
                  canManage={canContacts && !discharged}
                />
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {tab === "legajo" ? (
        <Card>
          <CardHeader
            title="Legajo"
            description={
              permissions.has("documents.files")
                ? "Documentación del ingreso. Las fotos son privadas: cada apertura queda registrada."
                : "Qué documentación está completa. Las fotos las ve Administración."
            }
          />
          <DocumentChecklist
            residentId={id}
            modality={resident.admissionModality}
            types={documentTypes}
            documents={documents}
            canFiles={permissions.has("documents.files") && !discharged}
          />
        </Card>
      ) : null}

      {tab === "actividad" ? (
        <Card>
          <CardHeader title="Actividad" description="Cada cambio, con quién lo hizo y cuándo." />
          <ActivityList items={activity} timeZone={site.timezone} />
        </Card>
      ) : null}
    </div>
  );
}
