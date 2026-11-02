import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FORM_TOKEN_FIELD, issueFormToken } from "@/features/public-intake/guard";
import { formTokenSecret, loadPublicSite } from "@/features/public-intake/server";

import { submitPublicRequestAction } from "./actions";
import { PublicRequestForm } from "./public-request-form";

export async function generateMetadata({
  params,
}: PageProps<"/residencia/[slug]/solicitar">): Promise<Metadata> {
  const site = await loadPublicSite((await params).slug);
  return { title: { absolute: site ? `Solicitar un lugar · ${site.name}` : "Solicitar un lugar" } };
}

/** Formulario público de solicitud de ingreso (F1-SOL-03, 12.9). */
export default async function PublicRequestPage({
  params,
}: PageProps<"/residencia/[slug]/solicitar">) {
  const { slug } = await params;
  const site = await loadPublicSite(slug);
  if (!site) notFound();
  const today = new Date().toLocaleDateString("sv-SE", {
    timeZone: "America/Argentina/Buenos_Aires",
  });

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight">
          Solicitar un lugar
        </h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Completá estos datos y alguien de {site.name} te va a llamar. Los campos con * son
          obligatorios.
        </p>
      </div>
      <PublicRequestForm
        action={submitPublicRequestAction.bind(null, slug)}
        // Clave del envío (no se duplica si se manda dos veces) y sello contra robots.
        hidden={{
          clientRequestId: randomUUID(),
          [FORM_TOKEN_FIELD]: issueFormToken(formTokenSecret()),
        }}
        privacyHref={`/residencia/${slug}/privacidad`}
        today={today}
      />
    </>
  );
}
