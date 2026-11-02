import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PageHeader } from "@/components/ui/page-header";

import { saveContactAction } from "../../../../pacientes/actions";
import { ContactForm, RemoveContactButton } from "../../../../pacientes/resident-forms";
import { loadDraftAdmission } from "../../../_shared";

export const metadata: Metadata = { title: "Ingreso · Contacto" };

export default async function AdmissionContactPage({
  params,
}: PageProps<"/ingresos/[id]/contacto/[contactId]">) {
  const { id, contactId } = await params;
  if (!z.uuid().safeParse(contactId).success) notFound();
  const { resident, contacts } = await loadDraftAdmission(id);
  const contact = contacts.find((item) => item.id === contactId);
  if (!contact) notFound();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <PageHeader
        title={contact.name}
        back={{ href: `/ingresos/${id}/responsable` as Route, label: "Responsable y contactos" }}
      />
      <div className="flex flex-col gap-4 rounded-[14px] border bg-card p-5">
        <ContactForm
          action={saveContactAction.bind(null, resident.id, contactId, "ingreso")}
          defaults={contact}
          otherContacts={contacts.filter((item) => item.id !== contactId)}
        />
        <div className="border-t pt-4">
          <RemoveContactButton
            residentId={resident.id}
            contactId={contactId}
            back="ingreso"
            name={contact.name}
          />
        </div>
      </div>
    </div>
  );
}
