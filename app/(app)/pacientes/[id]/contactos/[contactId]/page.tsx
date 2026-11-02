import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PageHeader } from "@/components/ui/page-header";
import { fullName } from "@/features/residents/format";
import { getContact, getResident, listContacts } from "@/features/residents/queries";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";

import { saveContactAction } from "../../../actions";
import { ContactForm, RemoveContactButton } from "../../../resident-forms";

export const metadata: Metadata = { title: "Editar contacto" };

export default async function EditContactPage({
  params,
}: PageProps<"/pacientes/[id]/contactos/[contactId]">) {
  const context = await requirePermission("contacts.manage");
  const { id, contactId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(contactId).success) notFound();
  const data = await inTenant(context, async (tx) => ({
    resident: await getResident(tx, id),
    contact: await getContact(tx, id, contactId),
    contacts: await listContacts(tx, id),
  }));
  if (!data.resident || !data.contact?.active) notFound();
  if (!["active", "hospitalized"].includes(data.resident.status)) notFound();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <PageHeader
        title={data.contact.name}
        description={`Contacto de ${fullName(data.resident)}`}
        back={{ href: `/pacientes/${id}?tab=contactos` as Route, label: "Contactos" }}
      />
      <div className="flex flex-col gap-4 rounded-[14px] border bg-card p-5">
        <ContactForm
          action={saveContactAction.bind(null, id, contactId, "ficha")}
          defaults={data.contact}
          otherContacts={data.contacts.filter((contact) => contact.id !== contactId)}
        />
        <div className="border-t pt-4">
          <RemoveContactButton
            residentId={id}
            contactId={contactId}
            back="ficha"
            name={data.contact.name}
          />
        </div>
      </div>
    </div>
  );
}
