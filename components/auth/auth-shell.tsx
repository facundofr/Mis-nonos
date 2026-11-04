import { Check } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

import { HERO_PHOTO } from "@/components/brand/hero-photo";
import { LogoMark } from "@/components/brand/logo-mark";
import { BRAND } from "@/lib/brand";

const HIGHLIGHTS = [
  "Ficha de emergencia con llamada directa",
  "Traspaso de turno sin cuadernos",
  "Historial completo de cada registro",
];

/**
 * Marco de las pantallas de ingreso (diseño Login.dc.html). En escritorio,
 * la foto sin filtro arriba a la izquierda y el mensaje en un bloque salmón
 * debajo; en el teléfono, una franja corta de la foto con la marca, para que
 * el formulario quede a la vista.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background lg:flex-row">
      <aside className="hidden flex-col bg-primary text-primary-foreground lg:flex lg:w-[45%] lg:max-w-[640px]">
        <div className="relative min-h-64 flex-1 overflow-hidden">
          <Image
            src={HERO_PHOTO}
            alt=""
            fill
            preload
            sizes="(min-width: 1024px) 45vw, 0px"
            className="absolute inset-0 size-full object-cover object-[42%_45%]"
          />
          <div className="relative p-12 pb-0">
            <BrandName />
          </div>
        </div>
        <div className="flex flex-col gap-8 p-12">
          <div className="flex max-w-[460px] flex-col gap-4">
            <p className="text-4xl leading-tight font-semibold tracking-tight text-balance">
              Cada residente, cada turno, todo en un solo lugar.
            </p>
            <p className="text-base leading-relaxed text-primary-foreground/80">
              Contactos y la ficha de emergencia a un toque, con registro de quién hizo qué y
              cuándo.
            </p>
          </div>
          <ul className="flex flex-col gap-2.5 text-sm text-primary-foreground/80">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <Check aria-hidden="true" className="size-4 text-primary-foreground" />
                {item}
              </li>
            ))}
          </ul>
        </div>
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
          <div className="relative px-6 pt-5">
            <BrandName />
          </div>
        </header>
        <main className="flex flex-1 justify-center px-6 py-8 lg:items-center lg:py-12">
          <div className="flex w-full max-w-[380px] flex-col gap-7">{children}</div>
        </main>
      </div>
    </div>
  );
}

/** Marca sobre la foto: una pastilla clara para que se lea sobre cualquier zona. */
function BrandName() {
  return (
    <div className="inline-flex items-center gap-2.5 self-start rounded-[14px] bg-white/90 py-1.5 pr-3.5 pl-1.5 text-[#16201e] shadow-sm backdrop-blur-sm">
      <span className="flex size-9 items-center justify-center rounded-[10px] bg-primary text-primary-foreground">
        <LogoMark className="size-5" />
      </span>
      <span className="text-lg font-semibold tracking-tight">{BRAND.appName}</span>
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
