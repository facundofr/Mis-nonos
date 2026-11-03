"use client";

import {
  ArrowRightLeft,
  ClipboardList,
  HeartPulse,
  House,
  IdCard,
  Menu,
  Plus,
  Settings,
  ShieldCheck,
  Siren,
  Stethoscope,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import type { NavIcon, NavItem } from "./nav-items";

const ICONS: Record<NavIcon, LucideIcon> = {
  home: House,
  residents: Users,
  notes: ClipboardList,
  handover: ArrowRightLeft,
  specialties: Stethoscope,
  professionals: IdCard,
  nursing: HeartPulse,
  emergencies: Siren,
  staff: UserRound,
  fees: Wallet,
  users: ShieldCheck,
  settings: Settings,
  more: Menu,
};

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Menú lateral de escritorio (diseño Inicio). */
export function SidebarLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const main = items.filter((item) => item.group === "main");
  const admin = items.filter((item) => item.group === "admin");
  const renderLink = (item: NavItem) => {
    const Icon = ICONS[item.icon];
    const active = isActive(pathname, item.href);
    return (
      <li key={item.key}>
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium text-sidebar-foreground transition-colors",
            "hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-sidebar-ring/40 focus-visible:outline-none",
            active && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground",
          )}
        >
          <Icon aria-hidden="true" className="size-5 shrink-0" />
          {item.label}
        </Link>
      </li>
    );
  };
  return (
    <div className="flex flex-1 flex-col justify-between gap-6">
      <ul className="flex flex-col gap-1">{main.map(renderLink)}</ul>
      {admin.length > 0 ? (
        <ul className="flex flex-col gap-1 border-t border-sidebar-border pt-4">
          {admin.map(renderLink)}
        </ul>
      ) : null}
    </div>
  );
}

// Clases fijas (Tailwind no ve clases armadas en el momento).
const COLUMNS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
};

/**
 * Barra inferior del teléfono (diseño TabBar, 13.2): pestañas, botón central
 * "+" elevado para registrar una novedad y "Más".
 */
export function TabBarLinks({
  items,
  canCreateNote,
}: {
  items: NavItem[];
  canCreateNote: boolean;
}) {
  const pathname = usePathname();
  // En la ficha de emergencia el "+" queda pegado a las llamadas y se toca sin
  // querer; ahí no se registra una novedad.
  const showCreate = canCreateNote && !/^\/pacientes\/[^/]+\/emergencia$/.test(pathname);
  const main = items.filter((item) => item.mobile === "tab");
  const create: NavItem = {
    key: "nueva-novedad",
    label: "Nueva novedad",
    href: "/novedades/nueva",
    icon: "notes",
    group: "main",
    mobile: "tab",
  };
  const middle = Math.ceil((main.length + 1) / 2);
  const tabs: NavItem[] = [
    ...main.slice(0, showCreate ? middle : main.length),
    ...(showCreate ? [create, ...main.slice(middle)] : []),
    { key: "mas", label: "Más", href: "/mas", icon: "more", group: "main", mobile: "tab" },
  ];
  // "Más" queda marcado también en las secciones que se abren desde ahí.
  const moreActive =
    isActive(pathname, "/mas") ||
    items.some((item) => item.mobile === "more" && isActive(pathname, item.href)) ||
    isActive(pathname, "/perfil");
  return (
    <ul
      className={cn("grid h-full items-start px-1 pt-1.5", COLUMNS[tabs.length] ?? "grid-cols-5")}
    >
      {tabs.map((item) => {
        if (item.key === "nueva-novedad") {
          return (
            <li key={item.key} className="flex justify-center">
              <Link
                href={item.href}
                aria-label="Registrar una novedad"
                className={cn(
                  "-mt-5 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-card",
                  "focus-visible:ring-ring/40 focus-visible:outline-none",
                )}
              >
                <Plus aria-hidden="true" className="size-7" />
              </Link>
            </li>
          );
        }
        const Icon = ICONS[item.icon];
        const active =
          item.key === "mas"
            ? moreActive
            : isActive(pathname, item.href) && !isActive(pathname, "/novedades/nueva");
        return (
          <li key={item.key} className="flex justify-center">
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-[60px] w-full flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium text-muted-foreground",
                "focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
                active && "font-semibold text-primary-ink",
              )}
            >
              <Icon aria-hidden="true" className="size-6" />
              {item.tabLabel ?? item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
