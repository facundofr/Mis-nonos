import { ClipboardList, MapPin, PhoneCall, Phone, UserRound } from "lucide-react";
import type { Metadata, Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { HERO_PHOTO, HERO_PHOTO_ALT } from "@/components/brand/hero-photo";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { loadPublicSite } from "@/features/public-intake/server";

export async function generateMetadata({
  params,
}: PageProps<"/residencia/[slug]">): Promise<Metadata> {
  const site = await loadPublicSite((await params).slug);
  return {
    title: { absolute: site ? `${site.name} · Solicitar un lugar` : "Residencia" },
    description: "Dejanos tus datos y te llamamos para coordinar una entrevista.",
  };
}

const DEFAULT_INTRO =
  "Acompañamos a cada residente las 24 horas, con un equipo que conoce su historia y a su familia. Si estás buscando un lugar para un familiar, dejanos tus datos y te llamamos.";

const STEPS = [
  {
    Icon: ClipboardList,
    title: "Completás la solicitud",
    text: "Te lleva unos minutos. Solo pedimos lo necesario para llamarte.",
  },
  {
    Icon: PhoneCall,
    title: "Te llamamos",
    text: "Alguien de la residencia se comunica con vos para conocer la situación.",
  },
  {
    Icon: UserRound,
    title: "Entrevista",
    text: "Coordinamos una visita. Ahí se ven el DNI original, la cobertura y los requisitos.",
  },
];

/** Landing pública de la residencia (F1-SOL-04): presentación y "Solicitar un lugar". */
export default async function PublicLandingPage({ params }: PageProps<"/residencia/[slug]">) {
  const { slug } = await params;
  const site = await loadPublicSite(slug);
  if (!site) notFound();

  return (
    <>
      <section className="overflow-hidden rounded-[18px] bg-primary text-primary-foreground">
        <div className="relative aspect-[16/10] sm:aspect-[21/9]">
          <Image
            src={HERO_PHOTO}
            alt={HERO_PHOTO_ALT}
            fill
            preload
            sizes="(min-width: 768px) 768px, 100vw"
            className="absolute inset-0 size-full object-cover object-[45%_45%]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-primary to-transparent"
          />
        </div>
        <div className="flex flex-col gap-4 px-6 pt-2 pb-8 sm:px-8 sm:pb-10">
          <span className="self-start rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">
            Residencia para adultos mayores
          </span>
          <h1 className="text-[30px] leading-tight font-semibold tracking-tight sm:text-4xl">
            {site.name}
          </h1>
          <p className="max-w-[560px] text-base leading-relaxed whitespace-pre-line text-primary-foreground/85">
            {site.intro ?? DEFAULT_INTRO}
          </p>
          <div className="flex flex-col gap-2.5 pt-2 sm:flex-row">
            <Link
              href={`/residencia/${slug}/solicitar` as Route}
              className={buttonClassName({
                variant: "outline",
                className: "border-transparent bg-white text-primary-ink hover:bg-white/90",
              })}
            >
              Solicitar un lugar
            </Link>
            {site.phone ? (
              <a
                href={`tel:${site.phone.replace(/[^0-9+]/g, "")}`}
                className={buttonClassName({
                  variant: "ghost",
                  className: "text-primary-foreground hover:bg-white/10",
                })}
              >
                <Phone aria-hidden="true" className="size-4" />
                Llamar a la residencia
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <Card aria-labelledby="como-sigue">
        <CardHeader id="como-sigue" title="Cómo sigue" />
        <ol className="flex flex-col gap-4 p-5">
          {STEPS.map(({ Icon, title, text }, index) => (
            <li key={title} className="flex items-start gap-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold">
                  {index + 1}. {title}
                </span>
                <span className="text-sm leading-snug text-muted-foreground">{text}</span>
              </span>
            </li>
          ))}
        </ol>
      </Card>

      {site.address || site.phone ? (
        <Card aria-labelledby="contacto">
          <CardHeader id="contacto" title="Contacto" />
          <ul className="flex flex-col gap-3 p-5 text-[15px]">
            {site.address ? (
              <li className="flex items-start gap-2.5">
                <MapPin
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                />
                {site.address}
              </li>
            ) : null}
            {site.phone ? (
              <li className="flex items-start gap-2.5">
                <Phone
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                />
                <a
                  href={`tel:${site.phone.replace(/[^0-9+]/g, "")}`}
                  className="underline-offset-4 hover:underline"
                >
                  {site.phone}
                </a>
              </li>
            ) : null}
          </ul>
        </Card>
      ) : null}

      <p className="text-sm leading-relaxed text-muted-foreground">
        Por este medio no pedimos diagnósticos, medicación ni fotos de documentos: eso se habla en
        la entrevista.
      </p>
    </>
  );
}
