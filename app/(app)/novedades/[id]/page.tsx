import { Pencil } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { buttonClassName } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { getNote, listNoteVersions } from "@/features/notes/queries";
import { canStillEdit, EDIT_WINDOW_HOURS } from "@/features/notes/schemas";
import { inTenant } from "@/lib/actions";
import { getPermissions, requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { formatDateKey, formatDateTime } from "@/lib/time/format";

import { ResolveForm } from "../note-forms";
import { NoteStatusBadge, noteSubject } from "../note-list";

export const metadata: Metadata = { title: "Novedad" };

/** Detalle de novedad (F.6): corregir, resolver y ver cambios. */
export default async function NotePage({ params, searchParams }: PageProps<"/novedades/[id]">) {
  const context = await requirePermission("residents.read");
  const { id } = await params;
  const query = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const [permissions, { site }] = await Promise.all([
    getPermissions(context),
    getSiteContext(context),
  ]);
  const canHistory = permissions.has("audit.read_resident");
  const data = await inTenant(context, async (tx) => {
    const note = await getNote(tx, id);
    if (!note) return null;
    return { note, versions: canHistory ? await listNoteVersions(tx, id) : [] };
  });
  if (!data) notFound();
  const { note, versions } = data;
  const subject = noteSubject(note);
  const pending = note.followUp && !note.resolvedAt;
  const canCorrect =
    permissions.has("notes.edit_own") &&
    note.createdBy === context.user.id &&
    !note.resolvedAt &&
    canStillEdit(note.createdAt, new Date());

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <PageHeader title="Novedad" back={{ href: "/novedades", label: "Novedades" }} />
      {query.corregida ? (
        <Notice tone="success">
          Corrección guardada. La versión anterior quedó en el historial.
        </Notice>
      ) : null}

      <Card>
        <div className="flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            {note.residentId ? (
              <Link
                href={`/pacientes/${note.residentId}?tab=novedades` as Route}
                className="font-semibold text-primary-ink underline-offset-4 hover:underline"
              >
                {subject}
              </Link>
            ) : (
              <span className="font-semibold">{subject}</span>
            )}
            <span className="text-sm text-muted-foreground">{note.categoryName}</span>
            <NoteStatusBadge note={note} />
          </div>
          <p className="text-base leading-relaxed whitespace-pre-line">{note.content}</p>
          <p className="text-[13px] text-muted-foreground">
            {[
              note.authorName,
              formatDateTime(note.createdAt, site.timezone),
              note.shiftName && note.shiftDate
                ? `Turno ${note.shiftName.toLocaleLowerCase("es-AR")} del ${formatDateKey(note.shiftDate)}`
                : null,
              note.version > 1 ? `corregida (versión ${note.version})` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {canCorrect ? (
            <Link
              href={`/novedades/${note.id}/corregir` as Route}
              className={buttonClassName({ variant: "outline", size: "md", className: "w-fit" })}
            >
              <Pencil aria-hidden="true" className="size-4" />
              Corregir
            </Link>
          ) : null}
        </div>
      </Card>

      {note.followUp ? (
        <Card>
          <CardHeader
            title="Seguimiento"
            description={pending ? "Abierto: aparece en pendientes y en el traspaso." : undefined}
          />
          <div className="p-5">
            {note.resolvedAt ? (
              <div className="flex flex-col gap-1">
                <p className="text-[15px]">
                  Resuelto por <b>{note.resolvedByName}</b> el{" "}
                  {formatDateTime(note.resolvedAt, site.timezone)}.
                </p>
                {note.resolutionNote ? (
                  <p className="text-[15px] whitespace-pre-line text-muted-foreground">
                    {note.resolutionNote}
                  </p>
                ) : null}
              </div>
            ) : permissions.has("notes.resolve") ? (
              <ResolveForm noteId={note.id} />
            ) : (
              <p className="text-sm text-muted-foreground">Sin resolver.</p>
            )}
          </div>
        </Card>
      ) : null}

      {canHistory && versions.length > 1 ? (
        <Card>
          <CardHeader
            title="Ver cambios"
            description={`Solo el autor puede corregir, hasta ${EDIT_WINDOW_HOURS} h después. Cada versión se conserva.`}
          />
          <ol className="flex flex-col">
            {versions.map((version) => (
              <li key={version.version} className="flex flex-col gap-1 border-t px-5 py-4">
                <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-medium">
                    {version.version === 1 ? "Original" : `Versión ${version.version}`}
                    {version.version === note.version ? " (vigente)" : ""}
                  </span>
                  <time
                    dateTime={version.editedAt.toISOString()}
                    className="text-[13px] text-muted-foreground"
                  >
                    {formatDateTime(version.editedAt, site.timezone)}
                  </time>
                </span>
                <span className="text-sm text-muted-foreground">
                  {version.editorName} · {version.categoryName}
                  {version.followUp ? " · con seguimiento" : ""}
                </span>
                <p className="text-[15px] whitespace-pre-line">{version.content}</p>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}
    </div>
  );
}
