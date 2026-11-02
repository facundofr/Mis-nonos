import { ChevronRight, Lightbulb, LogOut } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { visibleNavItems } from "@/components/layout/nav-items";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { signOutAction } from "@/lib/auth/actions";
import { getPermissions } from "@/lib/auth/authorization";
import { requireAppContext } from "@/lib/auth/session";
import { getSiteContext } from "@/lib/site/server";

import { resetOnboardingAction } from "../guia/actions";

export const metadata: Metadata = { title: "Más" };

/** Más (diseño MovilMas): perfil, secciones según el rol, apariencia y salir. */
export default async function MorePage() {
  const context = await requireAppContext();
  const [permissions, site] = await Promise.all([getPermissions(context), getSiteContext(context)]);
  const sections = visibleNavItems(permissions).filter((item) => item.mobile === "more");

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">Más</h1>

      <Link
        href="/perfil"
        className="flex items-center gap-3 rounded-[14px] border bg-card p-4 hover:bg-muted/60"
      >
        <Avatar name={context.user.name} size="lg" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">{context.user.name}</span>
          <span className="truncate text-sm text-muted-foreground">
            {context.membership.roleName}
            {site.current ? ` · Turno ${site.current.shift.name.toLocaleLowerCase("es-AR")}` : ""}
          </span>
        </span>
        <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground" />
      </Link>

      {sections.length > 0 ? (
        <ul className="overflow-hidden rounded-[14px] border bg-card">
          {sections.map((item) => (
            <li key={item.key} className="border-b last:border-b-0">
              <Link
                href={item.href}
                className="flex h-14 items-center justify-between gap-3 px-4 text-[15px] font-medium hover:bg-muted/60"
              >
                {item.label}
                <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <fieldset className="flex flex-col gap-2 rounded-[14px] border bg-card p-4">
        <legend className="float-left mb-1 text-sm font-semibold">Apariencia</legend>
        <ThemeToggle className="clear-both" />
        <p className="text-[13px] leading-snug text-muted-foreground">
          &quot;Sistema&quot; sigue la configuración del teléfono. El modo oscuro cansa menos la
          vista en el turno noche.
        </p>
      </fieldset>

      <form action={resetOnboardingAction}>
        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border bg-card text-[15px] font-medium hover:bg-muted/60"
        >
          <Lightbulb aria-hidden="true" className="size-5" />
          Volver a ver la guía
        </button>
      </form>

      <form action={signOutAction}>
        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border bg-card text-[15px] font-medium text-destructive hover:bg-muted/60"
        >
          <LogOut aria-hidden="true" className="size-5" />
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
