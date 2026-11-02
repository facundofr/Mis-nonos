import { ExternalLink } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";

import { Card, CardHeader } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { PRIVACY_NOTICE_IS_DRAFT } from "@/features/public-intake/privacy";
import { requirePermission } from "@/lib/auth/authorization";
import { env } from "@/lib/env";
import { getSiteContext } from "@/lib/site/server";

import { PublicIntakeForm } from "./public-intake-form";

export const metadata: Metadata = { title: "Formulario público" };

/**
 * Landing con el formulario de solicitud de ingreso (7.3-C3, 12.9). Es una
 * vía opcional más: la carga manual en Solicitudes sigue igual. Solo
 * Administración (settings.manage).
 */
export default async function PublicIntakeSettingsPage() {
  const context = await requirePermission("settings.manage");
  const { site } = await getSiteContext(context);
  const path = site.publicSlug ? `/residencia/${site.publicSlug}` : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader
        title="Formulario público"
        description="Una página donde las familias dejan sus datos para pedir un lugar. Las solicitudes llegan a la bandeja de Solicitudes."
        back={{ href: "/configuracion", label: "Configuración" }}
      />
      {PRIVACY_NOTICE_IS_DRAFT ? (
        <Notice tone="warning">
          El aviso de privacidad es un borrador. Antes de compartir la dirección con las familias,
          tiene que revisarlo el abogado.
        </Notice>
      ) : null}
      {site.publicIntakeEnabled && path ? (
        <Card aria-labelledby="publicado">
          <CardHeader
            id="publicado"
            title="Publicado"
            description={new URL(path, env.APP_URL).toString()}
            action={
              <Link
                href={path as Route}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
              >
                Abrir
                <ExternalLink aria-hidden="true" className="size-4" />
              </Link>
            }
          />
        </Card>
      ) : null}
      <Card>
        <CardHeader title="Configuración" />
        <div className="p-5">
          <PublicIntakeForm
            defaults={{
              publicIntakeEnabled: site.publicIntakeEnabled,
              publicSlug: site.publicSlug,
              publicIntro: site.publicIntro,
            }}
            baseUrl={new URL("/residencia/", env.APP_URL).toString()}
          />
        </div>
      </Card>
    </div>
  );
}
