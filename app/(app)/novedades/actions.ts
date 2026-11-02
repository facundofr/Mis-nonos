"use server";

import type { Route } from "next";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { noteSchema, noteSubjectSchema, resolveSchema } from "@/features/notes/schemas";
import { correctNote, createNote, resolveNote } from "@/features/notes/service";
import { inTenant, runAction } from "@/lib/actions";
import { fieldErrorsFrom, formValues, type FormState } from "@/lib/forms";
import { getSiteContext } from "@/lib/site/server";

const id = z.uuid();

/** Adónde vuelve "Nueva novedad": la lista o la ficha del paciente. */
export type NoteReturn = "novedades" | "ficha";

export async function createNoteAction(
  subject: string,
  back: NoteReturn,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsedSubject = noteSubjectSchema.safeParse(subject);
  if (!parsedSubject.success) return { error: "Elegí el paciente o “General”.", values };
  const residentId = parsedSubject.data === "general" ? null : parsedSubject.data;
  const parsed = noteSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  const result = await runAction(
    "notes.create",
    async (context) => {
      const { site } = await getSiteContext(context);
      await inTenant(context, (tx) =>
        createNote(tx, context.tenant, { ...parsed.data, residentId, siteId: site.id }),
      );
      return { success: "ok" };
    },
    { values },
  );
  if (result?.success) {
    redirect(
      (back === "ficha" && residentId
        ? `/pacientes/${residentId}?tab=novedades&registrada=1`
        : "/novedades?registrada=1") as Route,
    );
  }
  return result;
}

export async function correctNoteAction(
  noteId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const version = Number(formData.get("version"));
  if (!id.safeParse(noteId).success || !Number.isInteger(version)) {
    return { error: "Novedad inválida.", values };
  }
  const parsed = noteSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  const result = await runAction(
    "notes.edit_own",
    async (context) => {
      await inTenant(context, (tx) =>
        correctNote(tx, context.tenant, noteId, version, parsed.data),
      );
      return { success: "ok" };
    },
    { values },
  );
  if (result?.success) redirect(`/novedades/${noteId}?corregida=1` as Route);
  return result;
}

export async function resolveNoteAction(
  noteId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (!id.safeParse(noteId).success) return { error: "Novedad inválida.", values };
  const parsed = resolveSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  return runAction(
    "notes.resolve",
    async (context) => {
      await inTenant(context, (tx) => resolveNote(tx, context.tenant, noteId, parsed.data));
      refresh();
      return { success: "Seguimiento resuelto." };
    },
    { values },
  );
}
