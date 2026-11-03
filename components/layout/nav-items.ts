import type { Route } from "next";

import type { PermissionKey } from "@/lib/auth/permissions";

/*
 * Secciones de la navegación (13.2 y diseño Inicio/TabBar). Cada una aparece
 * solo si la persona tiene el permiso y el módulo está activo: los permisos
 * efectivos ya descuentan los módulos apagados (E3). No se muestran
 * secciones que todavía no funcionan (13.2).
 */

export type NavIcon =
  | "home"
  | "residents"
  | "notes"
  | "handover"
  | "specialties"
  | "professionals"
  | "nursing"
  | "emergencies"
  | "staff"
  | "fees"
  | "users"
  | "settings"
  | "more";

export interface NavItem {
  key: string;
  label: string;
  /** Texto corto para la barra del teléfono. */
  tabLabel?: string;
  href: Route;
  icon: NavIcon;
  /** Escritorio: "main" arriba; "admin" abajo, separado. */
  group: "main" | "admin";
  /** Hace falta alguno de estos permisos. Sin lista, lo ve cualquiera. */
  anyOf?: readonly PermissionKey[];
  /** Teléfono: pestaña de la barra inferior o entrada de "Más". */
  mobile: "tab" | "more";
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    key: "pacientes",
    label: "Pacientes",
    href: "/pacientes",
    icon: "residents",
    group: "main",
    anyOf: ["residents.read"],
    mobile: "tab",
  },
  {
    key: "novedades",
    label: "Novedades",
    href: "/novedades",
    icon: "notes",
    group: "main",
    anyOf: ["residents.read"],
    mobile: "tab",
  },
  {
    key: "turno",
    label: "Traspaso de turno",
    tabLabel: "Turno",
    href: "/turno",
    icon: "handover",
    group: "main",
    anyOf: ["residents.read"],
    mobile: "tab",
  },
  // Seguimiento del cuidado (docs/decisions/0017). En el teléfono, desde "Más".
  {
    key: "especialidades",
    label: "Especialidades",
    href: "/especialidades",
    icon: "specialties",
    group: "main",
    anyOf: ["care.read"],
    mobile: "more",
  },
  {
    key: "profesionales",
    label: "Profesionales",
    href: "/profesionales",
    icon: "professionals",
    group: "main",
    anyOf: ["care.read"],
    mobile: "more",
  },
  {
    key: "enfermeria",
    label: "Enfermería",
    href: "/enfermeria",
    icon: "nursing",
    group: "main",
    anyOf: ["care.read"],
    mobile: "more",
  },
  {
    key: "emergencias",
    label: "Emergencias",
    href: "/emergencias",
    icon: "emergencies",
    group: "main",
    anyOf: ["emergencies.manage"],
    mobile: "more",
  },
  // En el teléfono, el inicio se abre desde el logo y desde "Más" (13.2).
  { key: "inicio", label: "Inicio", href: "/inicio", icon: "home", group: "main", mobile: "more" },
  {
    key: "empleados",
    label: "Empleados",
    href: "/empleados",
    icon: "staff",
    group: "main",
    anyOf: ["staff.read"],
    mobile: "more",
  },
  {
    key: "abonos",
    label: "Abonos",
    href: "/abonos",
    icon: "fees",
    group: "main",
    anyOf: ["fees.read"],
    mobile: "more",
  },
  {
    key: "usuarios",
    label: "Usuarios y roles",
    href: "/usuarios",
    icon: "users",
    group: "admin",
    anyOf: ["users.manage"],
    mobile: "more",
  },
  {
    key: "configuracion",
    label: "Configuración",
    href: "/configuracion",
    icon: "settings",
    group: "admin",
    anyOf: ["settings.manage"],
    mobile: "more",
  },
];

/** Las secciones que puede ver alguien con estos permisos. */
export function visibleNavItems(permissions: ReadonlySet<PermissionKey>): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => !item.anyOf || item.anyOf.some((permission) => permissions.has(permission)),
  );
}
