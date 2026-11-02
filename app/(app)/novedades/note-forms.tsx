"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";

import { CheckboxField, Field, Textarea } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form-status";
import { FieldMessage } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";
import { cn } from "@/lib/utils";

import { correctNoteAction, createNoteAction, resolveNoteAction, type NoteReturn } from "./actions";

const NOTE_MAX_LENGTH = 2000;

interface NoteDefaults {
  categoryId: string;
  content: string;
  followUp: boolean;
}

/** Categoría, texto y seguimiento (diseño Novedad). */
function NoteFields({
  categories,
  state,
  defaults,
}: {
  categories: { id: string; name: string }[];
  state: FormState;
  defaults?: NoteDefaults;
}) {
  const values = state?.values;
  const picked = values ? values.categoryId : defaults?.categoryId;
  const followUp = values ? values.followUp === "on" : (defaults?.followUp ?? false);
  const error = state?.fieldErrors?.categoryId;
  return (
    <>
      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={error ? "categoria-error" : undefined}
      >
        <legend className="mb-2 text-sm font-medium">
          Categoría <span className="text-muted-foreground">*</span>
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {categories.map((category) => (
            <label
              key={category.id}
              className={cn(
                "relative flex h-12 cursor-pointer items-center justify-center rounded-[10px] border bg-card px-2 text-center text-[15px] font-medium",
                "has-checked:border-[1.5px] has-checked:border-primary has-checked:bg-secondary has-checked:text-secondary-foreground",
                "has-focus-visible:ring-3 has-focus-visible:ring-ring/30",
              )}
            >
              <input
                type="radio"
                name="categoryId"
                value={category.id}
                defaultChecked={picked === category.id}
                className="sr-only"
              />
              {category.name}
            </label>
          ))}
        </div>
        {error ? (
          <FieldMessage id="categoria-error" tone="error">
            {error}
          </FieldMessage>
        ) : null}
      </fieldset>

      <Field id="content" label="¿Qué pasó?" required error={state?.fieldErrors?.content}>
        {(control) => (
          <Textarea
            {...control}
            name="content"
            rows={5}
            maxLength={NOTE_MAX_LENGTH}
            defaultValue={values?.content ?? defaults?.content ?? ""}
          />
        )}
      </Field>

      <CheckboxField
        name="followUp"
        label="Requiere seguimiento"
        description="Aparece en pendientes y en el traspaso hasta que alguien la resuelva."
        defaultChecked={followUp}
      />
    </>
  );
}

export function NewNoteForm({
  subject,
  back,
  categories,
}: {
  subject: string;
  back: NoteReturn;
  categories: { id: string; name: string }[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    createNoteAction.bind(null, subject, back),
    null,
  );
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage state={state} />
      <NoteFields categories={categories} state={state} />
      <div className="flex flex-col gap-2">
        <SubmitButton size="lg">Guardar novedad</SubmitButton>
        <p className="text-center text-[13px] text-muted-foreground">
          Se registra con tu usuario, fecha y hora.
        </p>
      </div>
    </form>
  );
}

export function CorrectNoteForm({
  noteId,
  version,
  categories,
  defaults,
}: {
  noteId: string;
  version: number;
  categories: { id: string; name: string }[];
  defaults: NoteDefaults;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    correctNoteAction.bind(null, noteId),
    null,
  );
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="version" value={version} />
      <FormMessage state={state} />
      <NoteFields categories={categories} state={state} defaults={defaults} />
      <div className="flex flex-col gap-2">
        <SubmitButton size="lg">Guardar corrección</SubmitButton>
        <p className="text-center text-[13px] text-muted-foreground">
          La versión anterior se conserva en el historial.
        </p>
      </div>
    </form>
  );
}

/** "Resolver" en la lista: un toque, sin comentario. */
export function QuickResolveButton({ noteId, label }: { noteId: string; label: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    resolveNoteAction.bind(null, noteId),
    null,
  );
  if (state?.success) {
    return (
      <span
        role="status"
        className="flex items-center gap-1 text-sm font-medium text-success-foreground"
      >
        <Check aria-hidden="true" className="size-4" />
        Resuelta
      </span>
    );
  }
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <SubmitButton variant="outline" size="md" pendingLabel="Resolviendo…" aria-label={label}>
        Resolver
      </SubmitButton>
      {state?.error ? (
        <span role="alert" className="text-[13px] text-destructive">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

/** Resolver desde el detalle, con un comentario opcional (F.4). */
export function ResolveForm({ noteId }: { noteId: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    resolveNoteAction.bind(null, noteId),
    null,
  );
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <FormMessage state={state} />
      <Field
        id="resolutionNote"
        label="Comentario (opcional)"
        hint="Qué se hizo. Queda junto a la novedad."
        error={state?.fieldErrors?.resolutionNote}
      >
        {(control) => (
          <Textarea
            {...control}
            name="resolutionNote"
            rows={3}
            maxLength={500}
            className="min-h-20"
            defaultValue={state?.values?.resolutionNote ?? ""}
          />
        )}
      </Field>
      <SubmitButton pendingLabel="Resolviendo…">Marcar como resuelta</SubmitButton>
    </form>
  );
}
