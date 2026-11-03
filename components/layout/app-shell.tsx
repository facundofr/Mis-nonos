import { Bell, Clock, LogOut } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { LogoMark } from "@/components/brand/logo-mark";
import { Avatar } from "@/components/ui/avatar";
import { BRAND } from "@/lib/brand";
import { signOutAction } from "@/lib/auth/actions";

import type { NavItem } from "./nav-items";
import { SectionTrail, SidebarLinks, TabBarLinks } from "./nav-links";

export interface ShellProps {
  organizationName: string;
  userName: string;
  roleName: string;
  /** "Mañana · 06–14 h", o null si a esta hora no hay turno configurado. */
  shiftLabel: string | null;
  items: NavItem[];
  /** Botón central "+" de la barra del teléfono (registrar novedad, 13.2). */
  canCreateNote: boolean;
  /** Avisos sin leer (campana). */
  unreadNotifications: number;
  children: ReactNode;
}

/**
 * Marco de la app con sesión (13.2, diseños Inicio y TabBar):
 * - escritorio: menú lateral con la residencia y la persona, y una barra
 *   superior con el turno actual;
 * - teléfono: encabezado con la residencia y barra inferior fija.
 * La navegación solo trae lo que la persona puede usar.
 */
export function AppShell({
  organizationName,
  userName,
  roleName,
  shiftLabel,
  items,
  canCreateNote,
  unreadNotifications,
  children,
}: ShellProps) {
  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[260px_minmax(0,1fr)] print:block print:bg-white">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-sidebar-border bg-sidebar lg:flex print:hidden">
        <Link
          href="/inicio"
          aria-label="Ir al inicio"
          className="mx-3 mt-4 mb-2 flex items-center gap-3 rounded-lg p-2 focus-visible:ring-3 focus-visible:ring-sidebar-ring/40 focus-visible:outline-none"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary text-primary-foreground">
            <LogoMark className="size-5" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] font-semibold">{BRAND.appName}</span>
            <span className="truncate text-xs text-muted-foreground">{organizationName}</span>
          </span>
        </Link>
        <nav aria-label="Principal" className="flex-1 overflow-y-auto px-3 py-3">
          <SidebarLinks items={items} />
        </nav>
        <div className="flex items-center gap-2 border-t border-sidebar-border p-3">
          <Link
            href="/perfil"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent/70 focus-visible:ring-3 focus-visible:ring-sidebar-ring/40 focus-visible:outline-none"
          >
            <Avatar name={userName} size="sm" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold">{userName}</span>
              <span className="truncate text-xs text-muted-foreground">{roleName}</span>
            </span>
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground focus-visible:ring-3 focus-visible:ring-sidebar-ring/40 focus-visible:outline-none"
            >
              <LogOut aria-hidden="true" className="size-[18px]" />
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        {/* Encabezado: en el teléfono, la residencia; en escritorio, el turno. */}
        <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 print:hidden">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 lg:h-16 lg:px-8">
            <Link href="/inicio" className="flex min-w-0 items-center gap-2.5 lg:hidden">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-primary text-primary-foreground">
                <LogoMark className="size-4" />
              </span>
              <span className="truncate text-[15px] font-semibold">{organizationName}</span>
            </Link>
            <div className="hidden min-w-0 flex-1 lg:flex">
              <SectionTrail items={items} />
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {shiftLabel ? (
                <span className="hidden items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground sm:inline-flex">
                  <Clock aria-hidden="true" className="size-3.5" />
                  Turno {shiftLabel}
                </span>
              ) : null}
              <Link
                href="/notificaciones"
                aria-label={
                  unreadNotifications > 0
                    ? `Notificaciones: ${unreadNotifications} sin leer`
                    : "Notificaciones"
                }
                className="relative flex size-10 items-center justify-center rounded-full hover:bg-muted"
              >
                <Bell aria-hidden="true" className="size-5" />
                {unreadNotifications > 0 ? (
                  <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-bold text-destructive-foreground">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                ) : null}
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 lg:px-8 lg:pt-8 lg:pb-12">
          {children}
        </main>

        <nav
          aria-label="Navegación principal"
          className="fixed inset-x-0 bottom-0 z-30 h-[84px] border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden"
        >
          <TabBarLinks items={items} canCreateNote={canCreateNote} />
        </nav>
      </div>
    </div>
  );
}

/** Marco mínimo mientras falta un paso obligatorio (cambiar la contraseña o activar el 2FA). */
export function GateShell({
  organizationName,
  children,
}: {
  organizationName: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-3 px-4">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-primary text-primary-foreground">
              <LogoMark className="size-4" />
            </span>
            <span className="truncate text-[15px] font-semibold">{organizationName}</span>
          </span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-muted"
            >
              <LogOut aria-hidden="true" className="size-4" />
              Salir
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
