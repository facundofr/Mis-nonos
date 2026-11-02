import { randomUUID } from "node:crypto";

import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";

import { createRequestAction } from "../actions";
import { RequestForm } from "../request-forms";

export const metadata: Metadata = { title: "Nueva solicitud" };

/** Carga manual de una solicitud (F1-SOL-01): la familia llamó, escribió o vino. */
export default async function NewRequestPage() {
  const context = await requirePermission("admission_requests.manage");
  const { today } = await getSiteContext(context);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <PageHeader
        title="Nueva solicitud"
        description="Con el nombre del futuro paciente y un teléfono del responsable alcanza para empezar."
        back={{ href: "/solicitudes", label: "Solicitudes" }}
      />
      {/* Clave del envío: si se manda dos veces, no se duplica (idempotencia). */}
      <RequestForm
        action={createRequestAction}
        hidden={{ clientRequestId: randomUUID() }}
        submitLabel="Guardar solicitud"
        today={today}
      />
    </div>
  );
}
