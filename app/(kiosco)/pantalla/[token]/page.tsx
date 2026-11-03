import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renderSVG } from "uqr";

import { LogoMark } from "@/components/brand/logo-mark";
import { TOKEN_PATTERN } from "@/features/attendance/rules";
import { BRAND } from "@/lib/brand";
import { env } from "@/lib/env";

import { KioskClock } from "./kiosk-clock";

export const metadata: Metadata = {
  title: "Fichaje",
  robots: { index: false, follow: false },
};

/**
 * QR de fichaje en una pantalla fija de la entrada (docs/decisions/0020).
 * No necesita sesión, así la pantalla no se cierra sola: muestra el mismo
 * QR que el impreso (el enlace lo da Fichaje, solo a Administración). Si
 * se cambia el código, hay que abrir el enlace nuevo en la pantalla.
 */
export default async function KioskPage({ params }: PageProps<"/pantalla/[token]">) {
  const { token } = await params;
  if (!TOKEN_PATTERN.test(token)) notFound();
  const svg = renderSVG(new URL(`/fichar/${token}`, env.APP_URL).href, { border: 2 });

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-white p-6 text-center text-[#16201e]">
      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-[13px] bg-[#fa8072] text-[#1f0f0b]">
          <LogoMark className="size-7" />
        </span>
        <span className="text-3xl font-semibold tracking-tight">{BRAND.appName}</span>
      </div>
      <h1 className="max-w-3xl text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
        Escaneá para registrar tu entrada o tu salida
      </h1>
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG generado en el servidor */}
      <img
        src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
        alt="Código QR de fichaje"
        className="aspect-square w-[min(70vw,50vh)]"
      />
      <p className="text-xl text-[#4b5754]">
        Abrí la cámara del teléfono, apuntá al código y tocá el enlace. Al irte, escanealo de nuevo.
      </p>
      <KioskClock />
    </main>
  );
}
