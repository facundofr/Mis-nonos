import type { Metadata } from "next";
import { renderSVG } from "uqr";

import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/authorization";
import { env } from "@/lib/env";
import { getSiteContext } from "@/lib/site/server";

import { PrintButton, RotateTokenButton } from "./attendance-qr-actions";

export const metadata: Metadata = { title: "Asistencia con QR" };

/**
 * QR de asistencia (docs/decisions/0020): se imprime y se pega en la
 * entrada. Cada persona lo escanea con la cámara de su teléfono.
 */
export default async function AttendanceQrPage() {
  const context = await requirePermission("settings.manage");
  const { site } = await getSiteContext(context);
  const link = new URL(`/fichar/${site.attendanceToken}`, env.APP_URL).href;
  const svg = renderSVG(link, { border: 2 });

  return (
    <div className="flex flex-col gap-5">
      <div className="print:hidden">
        <PageHeader
          title="Asistencia con QR"
          description="Imprimí este QR y pegalo en la entrada. Cada persona lo escanea con la cámara de su teléfono al llegar y al irse: queda la hora exacta."
          back={{ href: "/configuracion", label: "Configuración" }}
        />
      </div>

      <section
        aria-label="QR para imprimir"
        className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 rounded-[18px] border bg-white p-6 text-center text-[#16201e] print:max-w-none print:border-2 print:p-10"
      >
        <p className="text-sm font-medium tracking-wide text-[#863a2a] uppercase">{site.name}</p>
        <h2 className="text-2xl font-semibold tracking-tight print:text-4xl">
          Registrá tu entrada y salida
        </h2>
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG generado en el servidor */}
        <img
          src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
          alt="Código QR de asistencia"
          className="size-64 print:size-[12cm]"
        />
        <p className="text-sm leading-relaxed print:text-xl">
          Abrí la cámara del teléfono, apuntá al código y tocá el enlace. Entrá con tu usuario de
          Mis Nonos.
        </p>
      </section>

      <div className="flex flex-col gap-4 print:hidden">
        <div className="flex justify-center">
          <PrintButton />
        </div>
        <Card>
          <CardHeader
            title="¿Se filtró el QR?"
            description="Si alguien le sacó una foto para registrar desde otro lado, cambiá el código. El QR impreso deja de funcionar y hay que pegar el nuevo."
          />
          <div className="p-5">
            <RotateTokenButton />
          </div>
        </Card>
      </div>
    </div>
  );
}
