import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { listSpecialties } from "@/features/care/queries";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";

import { ProfessionalForm } from "../professional-form";

export const metadata: Metadata = { title: "Agregar profesional" };

export default async function NewProfessionalPage() {
  const context = await requirePermission("care.manage");
  const specialties = await inTenant(context, (tx) => listSpecialties(tx, { activeOnly: true }));
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <PageHeader
        title="Agregar profesional"
        description="Lo que informa el profesional. No necesita usuario en la app."
        back={{ href: "/profesionales", label: "Profesionales" }}
      />
      <ProfessionalForm specialties={specialties} />
    </div>
  );
}
