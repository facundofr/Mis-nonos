import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { LogoMark } from "@/components/brand/logo-mark";
import { BRAND } from "@/lib/brand";

const HIGHLIGHTS = [
  "Ficha de emergencia con llamada directa",
  "Traspaso de turno sin cuadernos",
  "Historial completo de cada registro",
];

/**
 * Marco de las pantallas de ingreso (diseño Login.dc.html). En escritorio,
 * panel verde a la izquierda; en el teléfono, solo la marca arriba, para que
 * el formulario quede a la vista.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background lg:flex-row">
      <aside className="hidden flex-col justify-between gap-12 bg-primary p-12 text-primary-foreground lg:flex lg:w-[45%] lg:max-w-[640px]">
        <BrandName inverted />
        <div className="flex max-w-[460px] flex-col gap-4">
          <p className="text-4xl leading-tight font-semibold tracking-tight">
            Cada residente, cada turno, todo en un solo lugar.
          </p>
          <p className="text-base leading-relaxed text-primary-foreground/80">
            Novedades, contactos y la ficha de emergencia a un toque, con registro de quién hizo qué
            y cuándo.
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
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="px-6 pt-6 lg:hidden">
          <BrandName />
        </header>
        <main className="flex flex-1 justify-center px-6 py-10 lg:items-center lg:py-12">
          <div className="flex w-full max-w-[380px] flex-col gap-7">{children}</div>
        </main>
      </div>
    </div>
  );
}

function BrandName({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={
          inverted
            ? "flex size-10 items-center justify-center rounded-[11px] bg-white/15"
            : "flex size-10 items-center justify-center rounded-[11px] bg-primary text-primary-foreground"
        }
      >
        <LogoMark className="size-[22px]" />
      </span>
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
