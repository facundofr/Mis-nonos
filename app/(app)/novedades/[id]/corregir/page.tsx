import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { getNote, listActiveCategories } from "@/features/notes/queries";
import { canStillEdit, EDIT_WINDOW_HOURS } from "@/features/notes/schemas";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";

import { CorrectNoteForm } from "../../note-forms";
import { noteSubject } from "../../note-list";

export const metadata: Metadata = { title: "Corregir novedad" };

/** Corrección del autor, hasta 24 h después (F.4). Crea una versión nueva. */
export default async function CorrectNotePage({ params }: PageProps<"/novedades/[id]/corregir">) {
  const context = await requirePermission("notes.edit_own");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await inTenant(context, async (tx) => ({
    note: await getNote(tx, id),
    categories: await listActiveCategories(tx),
  }));
  const note = data.note;
  if (!note) notFound();
  const back = { href: `/novedades/${id}` as Route, label: "Novedad" };

  const reason =
    note.createdBy !== context.user.id
      ? "Solo quien registró la novedad puede corregirla."
      : note.resolvedAt
        ? "La novedad ya está resuelta: no se puede corregir."
        : !canStillEdit(note.createdAt, new Date())
          ? `Pasaron más de ${EDIT_WINDOW_HOURS} h desde que se registró: ya no se puede corregir. Registrá una novedad nueva.`
          : null;

  // Si la categoría original se desactivó, se sigue mostrando para no perderla.
  const categories = data.categories.some((category) => category.id === note.categoryId)
    ? data.categories
    : [...data.categories, { id: note.categoryId, name: note.categoryName }];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <PageHeader title="Corregir novedad" description={noteSubject(note)} back={back} />
      {reason ? (
        <Notice tone="warning">{reason}</Notice>
      ) : (
        <CorrectNoteForm
          noteId={note.id}
          version={note.version}
          categories={categories}
          defaults={{ categoryId: note.categoryId, content: note.content, followUp: note.followUp }}
        />
      )}
    </div>
  );
}
