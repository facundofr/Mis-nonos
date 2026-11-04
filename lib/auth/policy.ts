/**
 * Reglas de sesión y acceso confirmadas el 01/11/2026 (DC-10, DC-11, F.4).
 * Funciones puras: se usan en el servidor y se prueban sin base de datos.
 */

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const AUTH_POLICY = {
  /** Con "Mantener sesión en este dispositivo": 14 días, renovables con el uso. */
  rememberedSessionSeconds: 14 * DAY,
  /** Sin tildar: 12 h desde el ingreso, sin renovación. */
  notRememberedSessionSeconds: 12 * HOUR,
  /** Administración y Dirección: cierre por inactividad. */
  privilegedInactivitySeconds: 8 * HOUR,
  /** Cada cuánto se anota la actividad de una sesión (no en cada pedido). */
  activityTouchSeconds: 5 * MINUTE,
  /** Better Auth renueva una sesión recordada una vez por día de uso. */
  sessionUpdateAgeSeconds: DAY,
  passwordResetSeconds: 30 * MINUTE,
  invitationSeconds: 72 * HOUR,
  passwordMinLength: 10,
  passwordMaxLength: 128,
  /** Intentos fallidos por cuenta: 5 cada 15 minutos (sección 10.14). */
  loginFailuresPerAccount: 5,
  /** Respaldo por IP, más alto: el personal de una residencia suele compartir la conexión. */
  loginFailuresPerIp: 30,
  loginWindowSeconds: 15 * MINUTE,
} as const;

/**
 * Roles de sistema (docs/decisions/0021). Master es una sola persona por
 * residencia y no se asigna desde la app; los demás se eligen al dar el alta.
 */
export const SYSTEM_ROLES = [
  { key: "master", name: "Master" },
  { key: "admin", name: "Administración" },
  { key: "profesional", name: "Profesional" },
  { key: "asistente", name: "Asistente" },
] as const;

export type SystemRoleKey = (typeof SYSTEM_ROLES)[number]["key"];

/** Los roles que Administración puede elegir para una persona. */
export const ASSIGNABLE_ROLES = [
  "asistente",
  "profesional",
  "admin",
] as const satisfies readonly SystemRoleKey[];
export type AssignableRoleKey = (typeof ASSIGNABLE_ROLES)[number];

/** Roles que gestionan la residencia: usuarios, configuración y cuotas. */
export const MANAGER_ROLES: readonly SystemRoleKey[] = ["master", "admin"];

const PRIVILEGED_ROLES: ReadonlySet<string> = new Set<SystemRoleKey>(MANAGER_ROLES);

/** Master y Administración: 2FA obligatoria y cierre por inactividad. */
export function isPrivilegedRole(roleKey: string): boolean {
  return PRIVILEGED_ROLES.has(roleKey);
}

/**
 * Better Auth crea las sesiones sin "Mantener sesión" con 1 día de vida y las
 * recordadas con `rememberedSessionSeconds`. Por debajo de este umbral, la
 * sesión nueva es de las no recordadas.
 */
const NOT_REMEMBERED_DETECTION_SECONDS = 2 * DAY;

/**
 * Ajusta una sesión que Better Auth está por crear (hook de base de datos).
 * - Sin "Mantener sesión": tope absoluto de 12 h desde ahora.
 * - Si reemplaza a una sesión que ya tenía tope (Better Auth la renueva, por
 *   ejemplo, al activar el 2FA), conserva ese mismo tope.
 */
export function capNewSession(
  session: { expiresAt: Date; absoluteExpiresAt?: Date | null },
  now: Date,
): { expiresAt: Date; absoluteExpiresAt: Date | null } {
  const inherited = session.absoluteExpiresAt ?? null;
  if (inherited) {
    return { expiresAt: earliest(session.expiresAt, inherited), absoluteExpiresAt: inherited };
  }
  const lifetimeSeconds = (session.expiresAt.getTime() - now.getTime()) / 1000;
  if (lifetimeSeconds <= NOT_REMEMBERED_DETECTION_SECONDS) {
    const cap = new Date(now.getTime() + AUTH_POLICY.notRememberedSessionSeconds * 1000);
    return { expiresAt: earliest(session.expiresAt, cap), absoluteExpiresAt: cap };
  }
  return { expiresAt: session.expiresAt, absoluteExpiresAt: null };
}

export type SessionStatus = "active" | "expired" | "inactive";

export interface SessionPolicyInput {
  now: Date;
  createdAt: Date;
  absoluteExpiresAt: Date | null;
  lastActiveAt: Date | null;
  /** Rol en la residencia activa; nulo si todavía no se eligió residencia. */
  roleKey: string | null;
}

/** Decide si la sesión sigue vigente (DC-10) y si hay que anotar actividad. */
export function evaluateSession(input: SessionPolicyInput): {
  status: SessionStatus;
  touch: boolean;
} {
  const now = input.now.getTime();
  if (input.absoluteExpiresAt && input.absoluteExpiresAt.getTime() <= now) {
    return { status: "expired", touch: false };
  }
  const lastActive = (input.lastActiveAt ?? input.createdAt).getTime();
  const idleSeconds = (now - lastActive) / 1000;
  if (
    input.roleKey !== null &&
    isPrivilegedRole(input.roleKey) &&
    idleSeconds >= AUTH_POLICY.privilegedInactivitySeconds
  ) {
    return { status: "inactive", touch: false };
  }
  return { status: "active", touch: idleSeconds >= AUTH_POLICY.activityTouchSeconds };
}

function earliest(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}
