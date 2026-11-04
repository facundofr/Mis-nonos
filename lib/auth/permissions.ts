import type { SystemRoleKey } from "./policy";

/*
 * Permisos del MVP: matriz F.3 del plan, confirmada el 01/11/2026 (DC-01),
 * más los del seguimiento del cuidado (docs/decisions/0017) y la asistencia
 * (0020). La base tiene la misma matriz (migraciones 0005, 0035, 0037 y, desde los roles nuevos, 0040);
 * una prueba unitaria compara las dos para que no se separen.
 */

/** Módulos activables (E3). Un permiso vale solo si su módulo está activo. */
export type ModuleKey =
  "core" | "care" | "medication" | "clinical_record" | "staff" | "family" | "admin" | "fees";

interface PermissionDefinition {
  module: ModuleKey;
  description: string;
  roles: readonly SystemRoleKey[];
}

/** Todos los roles (docs/decisions/0021). */
const ALL: readonly SystemRoleKey[] = ["master", "admin", "profesional", "asistente"];
/** Los que escriben sobre los pacientes. */
const WRITERS: readonly SystemRoleKey[] = ["master", "admin", "profesional"];
/** Los que editan y gestionan: Master y Administración. */
const MANAGERS: readonly SystemRoleKey[] = ["master", "admin"];

export const PERMISSIONS = {
  "residents.read": {
    module: "core",
    description: "Ver la lista y la ficha del paciente",
    roles: ALL,
  },
  "residents.update": {
    module: "core",
    description: "Editar datos, cobertura, alergias, indicaciones y médico de cabecera",
    roles: MANAGERS,
  },
  "residents.status": {
    module: "core",
    description: "Marcar «internado fuera» y volver a «activo»",
    roles: MANAGERS,
  },
  "residents.discharge": {
    module: "core",
    description: "Registrar el egreso",
    roles: MANAGERS,
  },
  "admissions.manage": {
    module: "core",
    description: "Hacer, retomar y confirmar ingresos guiados",
    roles: MANAGERS,
  },
  "admission_requests.manage": {
    module: "core",
    description: "Cargar, gestionar y convertir solicitudes de ingreso",
    roles: MANAGERS,
  },
  "documents.files": {
    module: "core",
    description: "Ver, subir y reemplazar las fotos del legajo",
    roles: MANAGERS,
  },
  "contacts.manage": {
    module: "core",
    description: "Agregar, editar y ordenar contactos",
    roles: MANAGERS,
  },
  "emergency.view": {
    module: "core",
    description: "Abrir la ficha de emergencia",
    roles: ALL,
  },
  "emergency.pdf": {
    module: "core",
    description: "Generar la hoja de derivación",
    roles: ALL,
  },
  "notes.create": {
    module: "core",
    description: "Registrar novedades",
    roles: WRITERS,
  },
  "notes.edit_own": {
    module: "core",
    description: "Corregir las novedades propias (nueva versión)",
    roles: WRITERS,
  },
  "notes.resolve": {
    module: "core",
    description: "Resolver seguimientos",
    roles: WRITERS,
  },
  "handover.deliver": {
    module: "core",
    description: "Entregar el turno",
    roles: WRITERS,
  },
  "handover.confirm": {
    module: "core",
    description: "Confirmar la recepción del turno",
    roles: WRITERS,
  },
  "staff.read": {
    module: "core",
    description: "Ver empleados (nombre, rol y teléfono)",
    roles: ALL,
  },
  // Asistencia del personal (docs/decisions/0020).
  "attendance.record": {
    module: "core",
    description: "Registrar la propia entrada y salida",
    roles: ALL,
  },
  "attendance.read": {
    module: "core",
    description: "Ver el fichaje del personal y el QR",
    roles: MANAGERS,
  },
  "users.manage": {
    module: "core",
    description: "Invitar, cambiar el rol y desactivar usuarios",
    roles: MANAGERS,
  },
  "settings.manage": {
    module: "core",
    description: "Datos de la residencia, turnos, categorías, documentos y aviso del abono",
    roles: MANAGERS,
  },
  "fees.read": {
    module: "fees",
    description: "Ver abonos, cuotas y pagos",
    roles: MANAGERS,
  },
  "fees.manage": {
    module: "fees",
    description: "Fijar precios y registrar o anular pagos",
    roles: MANAGERS,
  },
  "audit.read_resident": {
    module: "core",
    description: "Ver el historial de cambios de un paciente y de sus novedades",
    roles: WRITERS,
  },
  "audit.read_all": {
    module: "core",
    description:
      "Ver toda la actividad, incluidas las aperturas de la ficha de emergencia y de las fotos",
    roles: MANAGERS,
  },
  // Registro completo de la app: solo Master (docs/decisions/0021).
  "audit.master": {
    module: "core",
    description: "Ver el registro completo de cambios de la app",
    roles: ["master"],
  },
  "org.export": {
    module: "core",
    description: "Exportar los datos de la residencia (E14)",
    roles: MANAGERS,
  },
  // Seguimiento del cuidado (fase 2 adelantada, migración 0035, docs/decisions/0017).
  "care.read": {
    module: "care",
    description: "Ver profesionales, especialidades y atenciones",
    roles: WRITERS,
  },
  "care.record": {
    module: "care",
    description: "Registrar y anular atenciones, también las de enfermería",
    roles: WRITERS,
  },
  "care.manage": {
    module: "care",
    description: "Agregar y editar profesionales y especialidades",
    roles: MANAGERS,
  },
  "emergencies.manage": {
    module: "care",
    description: "Registrar, completar y cerrar emergencias",
    roles: WRITERS,
  },
} as const satisfies Record<string, PermissionDefinition>;

export type PermissionKey = keyof typeof PERMISSIONS;

export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as PermissionKey[];

/** Pares (rol, permiso) de la matriz, en el orden del catálogo. */
export function rolePermissionPairs(): Array<{ role: SystemRoleKey; permission: PermissionKey }> {
  return PERMISSION_KEYS.flatMap((permission) =>
    PERMISSIONS[permission].roles.map((role) => ({ role, permission })),
  );
}

/**
 * Aplica la regla de módulos: de los permisos del rol, valen solo los de
 * módulos activos en la residencia.
 */
export function effectivePermissions(
  granted: Iterable<string>,
  enabledModules: Iterable<string>,
): Set<PermissionKey> {
  const modules = new Set(enabledModules);
  const result = new Set<PermissionKey>();
  for (const key of granted) {
    if (!(key in PERMISSIONS)) continue;
    const permission = key as PermissionKey;
    if (modules.has(PERMISSIONS[permission].module)) result.add(permission);
  }
  return result;
}
