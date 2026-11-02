import { Plus } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { z } from "zod";

import { buttonClassName } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import {
  countPendingNotes,
  decodeCursor,
  encodeCursor,
  listActiveCategories,
  listNotes,
  type NoteView,
} from "@/features/notes/queries";
import { inTenant } from "@/lib/actions";
import { getPermissions, requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { formatLongDate } from "@/lib/time/format";
import { cn } from "@/lib/utils";

import { NoteList } from "./note-list";
import { PageTip } from "../guia/page-tip";

export const metadata: Metadata = { title: "Novedades" };

const PAGE_SIZE = 30;

function chipClass(selected: boolean) {
  return cn(
    "flex h-10 shrink-0 items-center rounded-full border bg-card px-4 text-sm font-medium",
    selected && "border-primary bg-secondary font-semibold text-secondary-foreground",
  );
}

/**
 * Novedades (diseño MovilNovedades, 13.2): primero los pendientes con
 * seguimiento; cumple la función de inicio del personal en el teléfono.
 */
export default async function NotesPage({ searchParams }: PageProps<"/novedades">) {
  const context = await requirePermission("residents.read");
  const params = await searchParams;
  const [permissions, { site, current }] = await Promise.all([
    getPermissions(context),
    getSiteContext(context),
  ]);

  const { pending, categories } = await inTenant(context, async (tx) => ({
    pending: await countPendingNotes(tx, site.id),
    categories: await listActiveCategories(tx),
  }));
  // Sin pendientes, se abre directo en "Todas".
  const view: NoteView =
    params.ver === "todas" || (params.ver !== "pendientes" && pending === 0)
      ? "todas"
      : "pendientes";
  const categoryId =
    view === "todas" && z.uuid().safeParse(params.categoria).success
      ? (params.categoria as string)
      : undefined;
  const cursor = decodeCursor(typeof params.antes === "string" ? params.antes : undefined);

  const notes = await inTenant(context, (tx) =>
    listNotes(tx, { siteId: site.id, view, categoryId, cursor, limit: PAGE_SIZE + 1 }),
  );
  const hasMore = notes.length > PAGE_SIZE;
  const shown = notes.slice(0, PAGE_SIZE);
  const now = new Date();
  const base = view === "todas" ? "/novedades?ver=todas" : "/novedades?ver=pendientes";
  const withCategory = categoryId ? `${base}&categoria=${categoryId}` : base;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Novedades</h1>
          <p className="text-sm text-muted-foreground first-letter:uppercase">
            {formatLongDate(now, site.timezone)}
            {current ? ` · Turno ${current.shift.name.toLocaleLowerCase("es-AR")}` : ""}
          </p>
        </div>
        {permissions.has("notes.create") ? (
          <Link href="/novedades/nueva" className={buttonClassName({ size: "md" })}>
            <Plus aria-hidden="true" className="size-4" />
            Nueva novedad
          </Link>
        ) : null}
      </div>

      <PageTip context={context} tip="novedades" />
      {params.registrada ? <Notice tone="success">Novedad registrada.</Notice> : null}

      <nav aria-label="Filtrar novedades" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Link
          href="/novedades?ver=pendientes"
          aria-current={view === "pendientes" ? "page" : undefined}
          className={chipClass(view === "pendientes")}
        >
          Pendientes · {pending}
        </Link>
        <Link
          href="/novedades?ver=todas"
          aria-current={view === "todas" && !categoryId ? "page" : undefined}
          className={chipClass(view === "todas" && !categoryId)}
        >
          Todas
        </Link>
        {view === "todas"
          ? categories.map((category) => (
              <Link
                key={category.id}
                href={`/novedades?ver=todas&categoria=${category.id}` as Route}
                aria-current={categoryId === category.id ? "page" : undefined}
                className={chipClass(categoryId === category.id)}
              >
                {category.name}
              </Link>
            ))
          : null}
      </nav>

      <NoteList
        notes={shown}
        now={now}
        timeZone={site.timezone}
        canResolve={permissions.has("notes.resolve")}
        empty={
          view === "pendientes"
            ? {
                title: "Sin pendientes",
                body: "No hay seguimientos abiertos. Las novedades que piden seguimiento aparecen acá.",
              }
            : {
                title: "Sin novedades",
                body: "Todavía no hay novedades registradas con este filtro.",
              }
        }
      />

      {hasMore ? (
        <Link
          href={`${withCategory}&antes=${encodeURIComponent(encodeCursor(shown.at(-1)!))}` as Route}
          className={buttonClassName({ variant: "outline", size: "md", className: "self-center" })}
        >
          Ver anteriores
        </Link>
      ) : null}
    </div>
  );
}
