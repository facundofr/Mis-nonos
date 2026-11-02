import { CircleCheck } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonClassName } from "@/components/ui/button";
import { loadPublicSite } from "@/features/public-intake/server";

export const metadata: Metadata = { title: { absolute: "Solicitud enviada" } };

/**
 * Confirmación del formulario público. Es la misma para todos los envíos
 * (12.9): no dice si el DNI ya estaba ni si el envío se repitió.
 */
export default async function PublicRequestSentPage({
  params,
}: PageProps<"/residencia/[slug]/enviada">) {
  const { slug } = await params;
  const site = await loadPublicSite(slug);
  if (!site) notFound();

  return (
    <section className="flex flex-col items-start gap-4 rounded-[18px] border bg-card p-6 sm:p-8">
      <span className="flex size-12 items-center justify-center rounded-full bg-success text-success-foreground">
        <CircleCheck aria-hidden="true" className="size-6" />
      </span>
      <h1 className="text-[26px] leading-tight font-semibold tracking-tight">
        ¡Gracias! Recibimos tu solicitud
      </h1>
      <p className="text-[15px] leading-relaxed text-muted-foreground">
        Alguien de {site.name} te va a llamar en los próximos días para conocer la situación y
        coordinar una entrevista.
        {site.phone ? ` Si es urgente, podés llamar al ${site.phone}.` : null}
      </p>
      <Link
        href={`/residencia/${slug}` as Route}
        className={buttonClassName({ variant: "outline" })}
      >
        Volver al inicio
      </Link>
    </section>
  );
}
