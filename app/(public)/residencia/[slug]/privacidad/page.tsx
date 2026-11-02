import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PRIVACY_NOTICE, PRIVACY_NOTICE_VERSION } from "@/features/public-intake/privacy";
import { loadPublicSite } from "@/features/public-intake/server";

export const metadata: Metadata = { title: { absolute: "Aviso de privacidad" } };

/** Aviso de privacidad del formulario público (12.9). Borrador hasta la revisión legal. */
export default async function PublicPrivacyPage({
  params,
}: PageProps<"/residencia/[slug]/privacidad">) {
  const { slug } = await params;
  const site = await loadPublicSite(slug);
  if (!site) notFound();

  return (
    <article className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight">
          Aviso de privacidad
        </h1>
        <p className="text-sm text-muted-foreground">Versión {PRIVACY_NOTICE_VERSION}</p>
      </div>
      {PRIVACY_NOTICE.map((section) => (
        <section key={section.title} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{section.title}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-[15px] leading-relaxed">
              {paragraph.replaceAll("{residencia}", site.name)}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
