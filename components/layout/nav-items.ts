import type { Route } from "next";

import type { PermissionKey } from "@/lib/auth/permissions";
import { isSectionHidden } from "@/lib/navigation/hidden";

/*
 * Secciones de la navegación (13.2 y diseño Inicio/TabBar). Cada una aparece
 * solo si la persona tiene el permiso y el módulo está activo: los permisos
 * efectivos ya descuentan los módulos apagados (E3). No se muestran
 * secciones que todavía no funcionan (13.2).
 */

export type NavIcon =
  | "home"
  | "requests"
  | "residents"
  | "handover"
  | "attendance"
  | "specialties"
  | "professionals"
  | "emergencies"
  | "staff"
  | "users"
  | "settings"
  | "audit"
  | "more";

/**
 * Bloques del menú, como en un CRM de residencias: el día a día arriba, después
 * el cuidado, la gestión y los ajustes.
 */
export const NAV_SECTIONS = {
  diario: null,
  cuidado: "Cuidado",
  gestion: "Administración",
  ajustes: "Configuración",
} as const satisfies Record<string, string | null>;
export type NavSection = keyof typeof NAV_SECTIONS;

export interface NavItem {
  key: string;
  label: string;
  /** Texto corto para la barra del teléfono. */
  tabLabel?: string;
  href: Route;
  icon: NavIcon;
  /** Bloque del menú lateral (con su título) y del menú "Más". */
  section: NavSection;
  /** Hace falta alguno de estos permisos. Sin lista, lo ve cualquiera. */
  anyOf?: readonly PermissionKey[];
  /** Teléfono: pestaña de la barra inferior o entrada de "Más". */
  mobile: "tab" | "more";
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    key: "inicio",
    label: "Inicio",
    href: "/inicio",
    icon: "home",
    section: "diario",
    mobile: "tab",
  },
  {
    key: "pacientes",
    label: "Pacientes",
    href: "/pacientes",
    icon: "residents",
    section: "diario",
    anyOf: ["residents.read"],
    mobile: "tab",
  },
  {
    key: "turno",
    label: "Traspaso de turno",
    tabLabel: "Turno",
    href: "/turno",
    icon: "handover",
    section: "diario",
    // Asistente no entrega ni recibe el turno (docs/decisions/0021).
    anyOf: ["handover.deliver", "handover.confirm"],
    mobile: "tab",
  },
  // Asistencia con QR (docs/decisions/0020): solo Administración.
  {
    key: "fichaje",
    label: "Fichaje",
    href: "/fichaje",
    icon: "attendance",
    section: "diario",
    anyOf: ["attendance.read"],
    mobile: "more",
  },
  // Seguimiento del cuidado (docs/decisions/0017). En el teléfono, desde "Más".
  {
    key: "especialidades",
    label: "Especialidades",
    href: "/especialidades",
    icon: "specialties",
    section: "cuidado",
    anyOf: ["care.read"],
    mobile: "more",
  },
  {
    key: "profesionales",
    label: "Profesionales",
    href: "/profesionales",
    icon: "professionals",
    section: "cuidado",
    anyOf: ["care.read"],
    mobile: "more",
  },
  {
    key: "emergencias",
    label: "Emergencias",
    href: "/emergencias",
    icon: "emergencies",
    section: "cuidado",
    anyOf: ["emergencies.manage"],
    mobile: "more",
  },
  {
    key: "empleados",
    label: "Personal",
    href: "/empleados",
    icon: "staff",
    section: "gestion",
    anyOf: ["staff.read"],
    mobile: "more",
  },
  {
    key: "solicitudes",
    label: "Solicitudes de ingreso",
    href: "/solicitudes",
    icon: "requests",
    section: "gestion",
    anyOf: ["admission_requests.manage"],
    mobile: "more",
  },
  {
    key: "usuarios",
    label: "Usuarios y roles",
    href: "/usuarios",
    icon: "users",
    section: "ajustes",
    anyOf: ["users.manage"],
    mobile: "more",
  },
  {
    key: "configuracion",
    label: "Configuración",
    href: "/configuracion",
    icon: "settings",
    section: "ajustes",
    anyOf: ["settings.manage"],
    mobile: "more",
  },
  // Registro completo de cambios: solo Master (docs/decisions/0021).
  {
    key: "registro",
    label: "Registro de cambios",
    href: "/registro",
    icon: "audit",
    section: "ajustes",
    anyOf: ["audit.master"],
    mobile: "more",
  },
];

/** Las secciones que puede ver alguien con estos permisos. */
export function visibleNavItems(permissions: ReadonlySet<PermissionKey>): NavItem[] {
  return NAV_ITEMS.filter(
    (item) =>
      !isSectionHidden(item.key) &&
      (!item.anyOf || item.anyOf.some((permission) => permissions.has(permission))),
  );
}

/** Las secciones agrupadas por bloque, en el orden del menú (los vacíos no van). */
export function groupNavItems(
  items: readonly NavItem[],
): { section: NavSection; title: string | null; items: NavItem[] }[] {
  return (Object.keys(NAV_SECTIONS) as NavSection[])
    .map((section) => ({
      section,
      title: NAV_SECTIONS[section],
      items: items.filter((item) => item.section === section),
    }))
    .filter((group) => group.items.length > 0);
}
