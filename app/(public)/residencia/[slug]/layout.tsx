import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LogoMark } from "@/components/brand/logo-mark";
import { loadPublicSite } from "@/features/public-intake/server";

/*
 * Marco de la landing pública de cada residencia (7.3-C3, 12.9). Se ve sin
 * iniciar sesión. Si la residencia no publicó su formulario, la dirección
 * no existe (404), sin decir si la residencia existe o no.
 */
export default async function PublicLayout({
  children,
  params,
}: LayoutProps<"/residencia/[slug]">) {
  const { slug } = await params;
  const site = await loadPublicSite(slug);
  if (!site) notFound();
  const base = `/residencia/${slug}`;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-5 py-4">
          <Link href={base as Route} className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-primary text-primary-foreground">
              <LogoMark className="size-[22px]" />
            </span>
            <span className="truncate text-lg font-semibold tracking-tight">{site.name}</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-8">
        {children}
      </main>
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-5 text-sm text-muted-foreground">
          <span>{site.name}</span>
          <nav aria-label="Enlaces" className="flex gap-4">
            <Link
              href={`${base}/privacidad` as Route}
              className="underline-offset-4 hover:underline"
            >
              Aviso de privacidad
            </Link>
            <Link href="/ingresar" className="underline-offset-4 hover:underline">
              Ingreso del personal
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
