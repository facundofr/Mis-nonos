import Image from "next/image";
import type { ReactNode } from "react";

import { HERO_PHOTO } from "@/components/brand/hero-photo";
import { LogoMark } from "@/components/brand/logo-mark";
import { BRAND } from "@/lib/brand";

/**
 * Marco de las pantallas de ingreso. En escritorio, la foto sola ocupa la
 * columna izquierda; en el teléfono, una franja corta de la foto. La marca va
 * siempre arriba del formulario.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background lg:flex-row">
      <aside className="relative hidden overflow-hidden bg-primary lg:block lg:w-[45%] lg:max-w-[640px]">
        <Image
          src={HERO_PHOTO}
          alt=""
          fill
          preload
          sizes="(min-width: 1024px) 45vw, 0px"
          className="absolute inset-0 size-full object-cover object-[42%_45%]"
        />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="relative h-40 overflow-hidden bg-primary sm:h-48 lg:hidden">
          <Image
            src={HERO_PHOTO}
            alt=""
            fill
            preload
            sizes="(min-width: 1024px) 0px, 100vw"
            className="absolute inset-0 size-full object-cover object-[45%_42%]"
          />
        </header>
        <main className="flex flex-1 justify-center px-6 py-8 lg:items-center lg:py-12">
          <div className="flex w-full max-w-[380px] flex-col gap-7">
            <BrandName />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

/** Marca arriba del formulario. */
function BrandName() {
  return (
    <div className="flex items-center gap-3 self-start">
      <LogoMark className="size-11 rounded-[12px]" />
      <span className="text-xl font-semibold tracking-tight">{BRAND.appName}</span>
    </div>
  );
}

/** Encabezado de cada pantalla de ingreso. */
export function AuthHeading({
  title,
  description,
  eyebrow,
}: {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {eyebrow ? (
        <span className="self-start rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
          {eyebrow}
        </span>
      ) : null}
      <h1 className="text-[26px] leading-tight font-semibold tracking-tight">{title}</h1>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
