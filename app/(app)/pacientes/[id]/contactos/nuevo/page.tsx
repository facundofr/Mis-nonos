import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PageHeader } from "@/components/ui/page-header";
import { fullName } from "@/features/residents/format";
import { getResident, listContacts } from "@/features/residents/queries";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";

import { saveContactAction } from "../../../actions";
import { ContactForm } from "../../../resident-forms";

export const metadata: Metadata = { title: "Agregar contacto" };

export default async function NewContactPage({
  params,
}: PageProps<"/pacientes/[id]/contactos/nuevo">) {
  const context = await requirePermission("contacts.manage");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await inTenant(context, async (tx) => ({
    resident: await getResident(tx, id),
    contacts: await listContacts(tx, id),
  }));
  if (!data.resident || !["active", "hospitalized"].includes(data.resident.status)) notFound();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <PageHeader
        title="Agregar contacto"
        description={`Contacto de ${fullName(data.resident)}`}
        back={{ href: `/pacientes/${id}?tab=contactos` as Route, label: "Contactos" }}
      />
      <div className="rounded-[14px] border bg-card p-5">
        <ContactForm
          action={saveContactAction.bind(null, id, null, "ficha")}
          otherContacts={data.contacts}
          responsibleByDefault={!data.contacts.some((contact) => contact.isAdmissionResponsible)}
        />
      </div>
    </div>
  );
}
