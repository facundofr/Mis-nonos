import { ChevronRight } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { listDocumentTypes, listModules, listNoteCategories } from "@/features/settings/queries";
import { listPaymentMethods } from "@/features/fees/queries";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { formatTimeOfDay } from "@/lib/time/zoned";
import { PageTip } from "../guia/page-tip";

export const metadata: Metadata = { title: "Configuración" };

const MODULES = [
  { key: "core", name: "Pacientes, emergencias y turnos", phase: null },
  { key: "fees", name: "Abono mensual y pagos", phase: null },
  { key: "care", name: "Seguimiento del cuidado", phase: "F2" },
  { key: "medication", name: "Medicación y stock", phase: "F3" },
  { key: "clinical_record", name: "Historia clínica", phase: "F4" },
] as const;

/** Configuración (diseño MovilConfig). Solo Administración (settings.manage). */
export default async function SettingsPage() {
  const context = await requirePermission("settings.manage");
  const { site, shifts } = await getSiteContext(context);
  const { categories, documents, modules, methods } = await inTenant(context, async (tx) => ({
    categories: await listNoteCategories(tx),
    documents: await listDocumentTypes(tx),
    modules: await listModules(tx),
    methods: await listPaymentMethods(tx, site.id, false),
  }));
  const enabled = new Set(
    modules.filter((module) => module.enabled).map((module) => module.moduleKey),
  );

  const sections: { href: Route; title: string; summary: string }[] = [
    {
      href: "/configuracion/residencia",
      title: site.name,
      summary: [
        site.emergencyServiceName
          ? `Emergencias: ${site.emergencyServiceName}`
          : "Sin servicio de emergencias cargado",
        site.medicalControlText
          ? `Control médico ${site.medicalControlText.toLocaleLowerCase("es-AR")}`
          : null,
        `Aviso del abono ${site.feeReminderDaysBefore} días antes`,
      ]
        .filter(Boolean)
        .join(" · "),
    },
    {
      href: "/configuracion/turnos",
      title: "Turnos",
      summary:
        shifts
          .map(
            (shift) =>
              `${shift.name} ${formatTimeOfDay(shift.startsAt)}–${formatTimeOfDay(shift.endsAt)}`,
          )
          .join(" · ") || "Sin turnos activos",
    },
    {
      href: "/configuracion/asistencia" as Route,
      title: "Asistencia con QR",
      summary: "El QR de la entrada para registrar la llegada y la salida del personal",
    },
    {
      href: "/configuracion/categorias",
      title: "Categorías de novedades",
      summary: categories
        .filter((category) => category.active)
        .map((category) => category.name)
        .join(" · "),
    },
    {
      href: "/configuracion/documentos",
      title: "Documentos del legajo",
      summary: `${documents.filter((doc) => doc.active && doc.required).length} obligatorios · ${
        documents.filter((doc) => doc.active && !doc.required).length
      } opcionales`,
    },
    {
      href: "/configuracion/formulario-publico",
      title: "Formulario público",
      summary:
        site.publicIntakeEnabled && site.publicSlug
          ? `Publicado en /residencia/${site.publicSlug}/solicitar`
          : "Sin publicar · las familias piden un lugar desde un formulario propio",
    },
    ...(enabled.has("fees")
      ? [
          {
            href: "/configuracion/medios-de-pago" as Route,
            title: "Medios de pago del abono",
            summary:
              methods
                .filter((method) => method.active)
                .map((method) => method.name)
                .join(" · ") || "Sin medios activos",
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Configuración" back={{ href: "/mas", label: "Más" }} />
      <PageTip context={context} tip="configuracion" />
      <ul className="flex flex-col gap-2">
        {sections.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="flex items-center gap-3 rounded-[14px] border bg-card p-4 hover:bg-muted/60"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-semibold">{section.title}</span>
                <span className="text-sm leading-snug text-muted-foreground">
                  {section.summary}
                </span>
              </span>
              <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>

      <Card>
        <CardHeader title="Módulos" description="Los activa la plataforma para cada residencia." />
        <ul className="divide-y">
          {MODULES.map((module) => (
            <li key={module.key} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <span className="text-[15px]">{module.name}</span>
              {enabled.has(module.key) ? (
                <Badge tone="success">Activo</Badge>
              ) : (
                <Badge>{module.phase ? `Próximamente · ${module.phase}` : "Inactivo"}</Badge>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
