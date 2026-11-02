import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";

import { SiteForm } from "../settings-forms";

export const metadata: Metadata = { title: "Datos de la residencia" };

// Zonas horarias de Argentina (E11); se agrega la de la sede si es otra.
const ARGENTINA_TIMEZONES = Intl.supportedValuesOf("timeZone").filter((zone) =>
  zone.startsWith("America/Argentina/"),
);

export default async function SiteSettingsPage() {
  const context = await requirePermission("settings.manage");
  const { site } = await getSiteContext(context);
  const timezones = ARGENTINA_TIMEZONES.includes(site.timezone)
    ? ARGENTINA_TIMEZONES
    : [site.timezone, ...ARGENTINA_TIMEZONES];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader
        title="Datos de la residencia"
        back={{ href: "/configuracion", label: "Configuración" }}
      />
      <div className="rounded-[14px] border bg-card p-5">
        <SiteForm defaults={site} timezones={timezones} />
      </div>
    </div>
  );
}
