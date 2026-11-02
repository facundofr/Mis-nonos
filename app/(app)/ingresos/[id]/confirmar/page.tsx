import type { Metadata, Route } from "next";
import Link from "next/link";

import { Card, CardHeader } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { listPaymentMethods } from "@/features/fees/queries";
import { addDays, defaultFirstDueDate } from "@/features/fees/schedule";
import { formatNationalId, fullName } from "@/features/residents/format";
import { COVERAGE_TYPES, MODALITIES } from "@/features/residents/schemas";
import { inTenant } from "@/lib/actions";
import { can } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { formatDateKey } from "@/lib/time/format";

import { AdmissionSteps, loadDraftAdmission, stepHref } from "../../_shared";
import { CancelAdmissionButton, ConfirmAdmissionButton } from "./confirm-buttons";

export const metadata: Metadata = { title: "Ingreso · Revisar y confirmar" };

function Section({
  title,
  step,
  admissionId,
  children,
}: {
  title: string;
  step: number;
  admissionId: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        action={
          <Link
            href={stepHref(admissionId, step) as Route}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Cambiar
          </Link>
        }
      />
      <dl className="grid gap-2 p-5 text-[15px]">{children}</dl>
    </Card>
  );
}

function Item({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[12rem_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

/** Paso 4 (diseño IngresoConfirmar): resumen, faltantes y confirmación. */
export default async function AdmissionConfirmPage({
  params,
}: PageProps<"/ingresos/[id]/confirmar">) {
  const { id } = await params;
  const { context, admission, resident, contacts } = await loadDraftAdmission(id);
  const withFee = await can(context, "fees.manage");
  const { today } = await getSiteContext(context);
  const admissionDate = resident.admissionDate ?? today;
  const methods = withFee
    ? await inTenant(context, (tx) => listPaymentMethods(tx, resident.siteId))
    : [];
  const responsible = contacts.find((contact) => contact.isAdmissionResponsible);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader
        title="Revisar y confirmar"
        description={fullName(resident)}
        back={{ href: "/ingresos", label: "Ingresos en curso" }}
      />
      <AdmissionSteps admissionId={id} current={4} completed={admission.currentStep} />

      <Section title="Paciente y cobertura" step={1} admissionId={id}>
        <Item label="Nombre" value={fullName(resident)} />
        <Item label="DNI" value={formatNationalId(resident.nationalId)} />
        <Item
          label="Nacimiento"
          value={resident.birthDate ? formatDateKey(resident.birthDate) : null}
        />
        <Item
          label="Ingreso"
          value={resident.admissionDate ? formatDateKey(resident.admissionDate) : null}
        />
        <Item label="Habitación" value={resident.roomLabel} />
        <Item
          label="Modalidad"
          value={MODALITIES[resident.admissionModality as keyof typeof MODALITIES]}
        />
        <Item
          label="Cobertura"
          value={[
            COVERAGE_TYPES[resident.coverageType as keyof typeof COVERAGE_TYPES],
            resident.coverageMemberNumber,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
      </Section>

      <Section title="Responsable y contactos" step={2} admissionId={id}>
        <Item
          label="Responsable"
          value={
            responsible
              ? `${responsible.name}${responsible.relationship ? ` (${responsible.relationship.toLocaleLowerCase("es-AR")})` : ""}`
              : null
          }
        />
        <Item label="Contactos" value={`${contacts.length} en total`} />
      </Section>

      {!responsible ? (
        <Notice tone="warning">
          Falta el responsable de la internación: cargalo en el paso 2.
        </Notice>
      ) : null}

      <div className="flex flex-col gap-3">
        <ConfirmAdmissionButton
          admissionId={id}
          disabled={!responsible}
          fee={
            withFee
              ? {
                  defaultFirstDue: defaultFirstDueDate(admissionDate),
                  minDue: addDays(admissionDate, 1),
                  methods,
                }
              : undefined
          }
        />
        <CancelAdmissionButton admissionId={id} />
      </div>
    </div>
  );
}
