import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PageHeader } from "@/components/ui/page-header";
import { getProfessional, listSpecialties } from "@/features/care/queries";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";

import { ProfessionalForm } from "../professional-form";

export const metadata: Metadata = { title: "Editar profesional" };

export default async function EditProfessionalPage({ params }: PageProps<"/profesionales/[id]">) {
  const context = await requirePermission("care.manage");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await inTenant(context, async (tx) => ({
    professional: await getProfessional(tx, id),
    specialties: await listSpecialties(tx),
  }));
  const professional = data.professional;
  if (!professional) notFound();
  // Las activas, más la actual aunque se haya desactivado.
  const specialties = data.specialties.filter(
    (specialty) => specialty.active || specialty.id === professional.specialtyId,
  );
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <PageHeader
        title={professional.name}
        description="Editar datos del profesional."
        back={{ href: "/profesionales", label: "Profesionales" }}
      />
      <ProfessionalForm specialties={specialties} professional={professional} />
    </div>
  );
}
