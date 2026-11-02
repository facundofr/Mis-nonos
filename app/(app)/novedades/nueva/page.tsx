import { Megaphone, Search, TriangleAlert } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { noteSubjectSchema } from "@/features/notes/schemas";
import { listActiveCategories } from "@/features/notes/queries";
import { fullName } from "@/features/residents/format";
import { getResident, listAllergies, listResidents } from "@/features/residents/queries";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";

import type { NoteReturn } from "../actions";
import { NewNoteForm } from "../note-forms";
import { PageTip } from "../../guia/page-tip";

export const metadata: Metadata = { title: "Nueva novedad" };

/**
 * Nueva novedad (diseño Novedad, F.6): primero se elige el paciente o
 * "General" (opción fija, F.4); después, categoría, texto y seguimiento.
 */
export default async function NewNotePage({ searchParams }: PageProps<"/novedades/nueva">) {
  const context = await requirePermission("notes.create");
  const params = await searchParams;
  const back: NoteReturn = params.volver === "ficha" ? "ficha" : "novedades";
  const subject = noteSubjectSchema.safeParse(params.paciente);
  const query = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const keep = (extra: string) =>
    `/novedades/nueva?${extra}${back === "ficha" ? "&volver=ficha" : ""}` as Route;

  if (!subject.success) {
    const residents = await inTenant(context, (tx) =>
      listResidents(tx, { view: "activos", query, limit: 100 }),
    );
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <PageHeader
          title="Nueva novedad"
          description="¿De quién es la novedad?"
          back={{ href: "/novedades", label: "Novedades" }}
        />
        <PageTip context={context} tip="nueva-novedad" />
        <form role="search" className="relative">
          <label htmlFor="buscar" className="sr-only">
            Buscar paciente
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-3.5 left-3.5 size-5 text-muted-foreground"
          />
          <Input
            id="buscar"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Nombre o habitación"
            className="pl-11"
          />
          {back === "ficha" ? <input type="hidden" name="volver" value="ficha" /> : null}
        </form>
        <ul className="flex flex-col gap-2">
          <li>
            <Link
              href={keep("paciente=general")}
              className="flex items-center gap-3 rounded-[14px] border bg-card p-3.5 hover:bg-muted/60"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-muted">
                <Megaphone aria-hidden="true" className="size-5 text-muted-foreground" />
              </span>
              <span className="flex flex-col">
                <span className="font-semibold">General</span>
                <span className="text-sm text-muted-foreground">
                  De la residencia, no de un paciente
                </span>
              </span>
            </Link>
          </li>
          {residents.map((resident) => {
            const name = fullName(resident);
            return (
              <li key={resident.id}>
                <Link
                  href={keep(`paciente=${resident.id}`)}
                  className="flex items-center gap-3 rounded-[14px] border bg-card p-3.5 hover:bg-muted/60"
                >
                  <Avatar name={name} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold">{name}</span>
                    <span className="text-sm text-muted-foreground">
                      {[
                        resident.roomLabel ? `Hab. ${resident.roomLabel}` : null,
                        resident.status === "hospitalized" ? "Internado fuera" : null,
                        resident.hasAllergies ? "⚠ Alergia" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Sin habitación"}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        {residents.length === 0 && query ? (
          <p className="text-center text-sm text-muted-foreground">
            No hay pacientes activos que coincidan con “{query}”.
          </p>
        ) : null}
      </div>
    );
  }

  const residentId = subject.data === "general" ? null : subject.data;
  const data = await inTenant(context, async (tx) => {
    const resident = residentId ? await getResident(tx, residentId) : null;
    return {
      resident,
      allergies: residentId ? await listAllergies(tx, residentId) : [],
      categories: await listActiveCategories(tx),
    };
  });
  if (residentId && !data.resident) notFound();
  const resident = data.resident;
  const inactive = resident && !["active", "hospitalized"].includes(resident.status);
  const name = resident ? fullName(resident) : "General";

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <PageHeader
        title="Nueva novedad"
        back={
          back === "ficha" && resident
            ? { href: `/pacientes/${resident.id}?tab=novedades` as Route, label: name }
            : { href: "/novedades", label: "Novedades" }
        }
      />
      <PageTip context={context} tip="nueva-novedad" />
      <section aria-label="Paciente" className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Paciente</span>
        <div className="flex items-center gap-3 rounded-[14px] border bg-card p-3.5">
          {resident ? (
            <Avatar name={name} />
          ) : (
            <span className="flex size-10 items-center justify-center rounded-full bg-muted">
              <Megaphone aria-hidden="true" className="size-5 text-muted-foreground" />
            </span>
          )}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-semibold">{name}</span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              {resident
                ? resident.roomLabel
                  ? `Hab. ${resident.roomLabel}`
                  : "Sin habitación"
                : "De la residencia"}
              {data.allergies.length > 0 ? (
                <span className="flex items-center gap-1 text-destructive">
                  · <TriangleAlert aria-hidden="true" className="size-3.5" /> Alergia
                </span>
              ) : null}
            </span>
          </span>
          <Link
            href={keep(query ? `q=${encodeURIComponent(query)}` : "")}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Cambiar
          </Link>
        </div>
      </section>
      {inactive ? (
        <Notice tone="warning">
          {name} no está activo/a: no se le pueden registrar novedades.
        </Notice>
      ) : data.categories.length === 0 ? (
        <Notice tone="warning">
          No hay categorías activas. Pedile a Administración que las configure.
        </Notice>
      ) : (
        <NewNoteForm subject={subject.data} back={back} categories={data.categories} />
      )}
    </div>
  );
}
