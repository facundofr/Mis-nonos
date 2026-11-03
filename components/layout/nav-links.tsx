"use client";

import {
  ArrowRightLeft,
  ChevronRight,
  ClipboardList,
  Inbox,
  HeartPulse,
  House,
  IdCard,
  Menu,
  Plus,
  Settings,
  ShieldCheck,
  Siren,
  Stethoscope,
  UserCheck,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { groupNavItems, NAV_SECTIONS, type NavIcon, type NavItem } from "./nav-items";

const ICONS: Record<NavIcon, LucideIcon> = {
  home: House,
  requests: Inbox,
  residents: Users,
  notes: ClipboardList,
  handover: ArrowRightLeft,
  attendance: UserCheck,
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

/** La sección abierta: la de href más largo que coincide (así /pacientes/x es Pacientes). */
function currentItem(items: readonly NavItem[], pathname: string): NavItem | undefined {
  return items
    .filter((item) => isActive(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

/** Menú lateral de escritorio: bloques con título (Cuidado, Administración, Configuración). */
export function SidebarLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const active = currentItem(items, pathname);
  return (
    <div className="flex flex-col gap-5">
      {groupNavItems(items).map((group) => (
        <div key={group.section} className="flex flex-col gap-1">
          {group.title ? (
            <p className="px-3 pb-1 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              {group.title}
            </p>
          ) : null}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const Icon = ICONS[item.icon];
              const current = active?.key === item.key;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "relative flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-medium text-sidebar-foreground/85 transition-colors",
                      "hover:bg-sidebar-accent/70 hover:text-sidebar-foreground focus-visible:ring-3 focus-visible:ring-sidebar-ring/40 focus-visible:outline-none",
                      current &&
                        "bg-sidebar-accent font-semibold text-sidebar-accent-foreground before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-sidebar-primary",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-[18px] shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Encabezado de escritorio: dónde estás ("CUIDADO › Enfermería"). */
export function SectionTrail({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const item = currentItem(items, pathname);
  if (!item) return <span />;
  const section = NAV_SECTIONS[item.section];
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-sm">
      {section ? (
        <>
          <span className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {section}
          </span>
          <ChevronRight aria-hidden="true" className="size-3.5 text-muted-foreground" />
        </>
      ) : null}
      <span className="truncate font-semibold">{item.label}</span>
    </p>
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
    section: "diario",
    mobile: "tab",
  };
  const middle = Math.ceil((main.length + 1) / 2);
  const tabs: NavItem[] = [
    ...main.slice(0, showCreate ? middle : main.length),
    ...(showCreate ? [create, ...main.slice(middle)] : []),
    { key: "mas", label: "Más", href: "/mas", icon: "more", section: "diario", mobile: "tab" },
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
