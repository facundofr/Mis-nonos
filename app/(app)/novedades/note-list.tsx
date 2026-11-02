import { ClipboardList } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { NoteListItem } from "@/features/notes/queries";
import { fullName } from "@/features/residents/format";
import { formatWhen } from "@/lib/time/format";

import { QuickResolveButton } from "./note-forms";

export function noteSubject(
  note: Pick<
    NoteListItem,
    "residentId" | "residentFirstName" | "residentLastName" | "residentRoom"
  >,
): string {
  if (!note.residentId || !note.residentFirstName || !note.residentLastName) return "General";
  const name = fullName({ firstName: note.residentFirstName, lastName: note.residentLastName });
  return note.residentRoom ? `${name} · Hab. ${note.residentRoom}` : name;
}

export function NoteStatusBadge({ note }: { note: Pick<NoteListItem, "followUp" | "resolvedAt"> }) {
  if (!note.followUp) return null;
  return note.resolvedAt ? (
    <Badge tone="success">Resuelta</Badge>
  ) : (
    <Badge tone="warning">◐ Seguimiento</Badge>
  );
}

/** Lista de novedades (diseño MovilNovedades): quién, texto, turno, autor y hora. */
export function NoteList({
  notes,
  now,
  timeZone,
  canResolve,
  showSubject = true,
  empty,
}: {
  notes: NoteListItem[];
  now: Date;
  timeZone: string;
  canResolve: boolean;
  showSubject?: boolean;
  empty: { title: string; body: string };
}) {
  if (notes.length === 0) {
    return (
      <div className="rounded-[14px] border bg-card">
        <EmptyState icon={ClipboardList} title={empty.title}>
          {empty.body}
        </EmptyState>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-2.5">
      {notes.map((note) => {
        const subject = noteSubject(note);
        const meta = [
          note.shiftName ? `Turno ${note.shiftName.toLocaleLowerCase("es-AR")}` : null,
          note.authorName,
          formatWhen(note.createdAt, now, timeZone),
          note.version > 1 ? "corregida" : null,
        ]
          .filter(Boolean)
          .join(" · ");
        const pending = note.followUp && !note.resolvedAt;
        return (
          <li
            key={note.id}
            className="flex flex-col gap-2 rounded-[14px] border bg-card p-4 hover:bg-muted/40"
          >
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/novedades/${note.id}` as Route}
                className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                <span className="flex flex-wrap items-center gap-2">
                  {showSubject ? <span className="font-semibold">{subject}</span> : null}
                  <span className="text-sm text-muted-foreground">{note.categoryName}</span>
                  <NoteStatusBadge note={note} />
                </span>
                <span className="line-clamp-3 text-[15px] leading-relaxed whitespace-pre-line">
                  {note.content}
                </span>
                <span className="text-[13px] text-muted-foreground">{meta}</span>
              </Link>
              {pending && canResolve ? (
                <QuickResolveButton
                  noteId={note.id}
                  label={`Resolver el seguimiento: ${subject}`}
                />
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
