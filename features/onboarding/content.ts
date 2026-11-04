import type { PermissionKey } from "@/lib/auth/permissions";
import { isSectionHidden } from "@/lib/navigation/hidden";

/*
 * Textos de la guía de uso (onboarding). Cada paso y cada consejo aparece
 * solo si la persona tiene el permiso: la guía se arma según lo que cada
 * rol puede hacer. Sin datos de pacientes.
 */

export type WelcomeIcon =
  | "home"
  | "residents"
  | "notes"
  | "handover"
  | "admission"
  | "activity"
  | "settings"
  | "fees"
  | "privacy";

export interface WelcomeStep {
  key: string;
  icon: WelcomeIcon;
  title: string;
  body: string;
  /** Hace falta alguno de estos permisos. Sin lista, lo ve cualquiera. */
  anyOf?: readonly PermissionKey[];
}

export const WELCOME_KEY = "welcome";

export const WELCOME_STEPS: readonly WelcomeStep[] = [
  {
    key: "inicio",
    icon: "home",
    title: "Te damos la bienvenida",
    body: "Acá se registra el día a día de la residencia. En un minuto te mostramos lo principal.",
  },
  {
    key: "pacientes",
    icon: "residents",
    title: "Pacientes y emergencia",
    body: "En Pacientes buscás por nombre, habitación o DNI. El botón rojo «Emergencia» abre lo necesario para actuar: alergias, cobertura, a quién llamar y la hoja de derivación.",
    anyOf: ["emergency.view"],
  },
  {
    key: "novedades",
    icon: "notes",
    title: "Novedades con el botón «+»",
    body: "Registrá lo que pasa en segundos. Si hay que seguirlo, marcá «Requiere seguimiento»: queda pendiente hasta que alguien lo resuelva.",
    anyOf: ["notes.create"],
  },
  {
    key: "turno",
    icon: "handover",
    title: "Traspaso de turno",
    body: "Al terminar tu turno, en «Turno» ves el resumen y lo entregás con una nota para quien entra. Nada se pierde entre un turno y otro.",
    anyOf: ["handover.deliver", "handover.confirm"],
  },
  {
    key: "ingresos",
    icon: "admission",
    title: "Ingresos y legajo",
    body: "Las familias que piden una vacante quedan en «Solicitudes». Los pacientes entran con el ingreso guiado: datos, responsable, documentos y confirmación; se puede dejar a medias. Las fotos del legajo son privadas.",
    anyOf: ["admissions.manage"],
  },
  {
    key: "abonos",
    icon: "fees",
    title: "Abono mensual",
    body: "En «Abonos» ves las cuotas del mes y registrás los pagos. Una semana antes de cada vencimiento te llega un aviso en la app y por email. Solo Administración ve los montos.",
    anyOf: ["fees.read"],
  },
  {
    key: "actividad",
    icon: "activity",
    title: "Avisos y actividad",
    body: "La campana muestra tus avisos. En el Inicio ves la actividad reciente de toda la residencia y los legajos incompletos.",
    anyOf: ["audit.read_all"],
  },
  {
    key: "configuracion",
    icon: "settings",
    title: "Dejá todo listo",
    body: "En Configuración cargás los datos de la residencia, el servicio de emergencias, los turnos y las categorías; en Usuarios y roles sumás al personal. En el Inicio tenés una lista con los pasos.",
    anyOf: ["settings.manage", "users.manage"],
  },
  {
    key: "privacidad",
    icon: "privacy",
    title: "Cuidamos los datos",
    body: "Todo lo que hacés queda registrado con tu usuario. No compartas tu contraseña y cerrá sesión en los teléfonos compartidos. Esta guía la podés volver a ver desde «Más».",
  },
];

export function welcomeStepsFor(permissions: ReadonlySet<PermissionKey>): WelcomeStep[] {
  return WELCOME_STEPS.filter(
    (step) =>
      !isSectionHidden(step.key) &&
      (!step.anyOf || step.anyOf.some((permission) => permissions.has(permission))),
  );
}

/** Consejos que aparecen la primera vez que se entra a cada pantalla. */
export const TIPS = {
  pacientes: {
    title: "Buscá rápido",
    body: "Escribí nombre, habitación o DNI, con o sin acentos. «Emergencia» abre la ficha para actuar sin vueltas.",
  },
  ficha: {
    title: "Todo el paciente, por pestañas",
    body: "En «Novedades» está lo registrado del paciente y en «Actividad», quién cambió qué y cuándo.",
  },
  novedades: {
    title: "Pendientes primero",
    body: "Son las novedades que piden seguimiento. Tocá «Resolver» cuando esté hecho; para dejar un comentario, entrá a la novedad.",
  },
  "nueva-novedad": {
    title: "¿De quién es la novedad?",
    body: "Elegí al paciente o «General» si es algo de la residencia. Podés corregirla durante 24 h y la versión anterior se conserva.",
  },
  turno: {
    title: "Entregá tu turno",
    body: "Una hora antes de terminar ya podés entregarlo. Quien entra ve los pendientes, las novedades del turno y tu nota.",
  },
  ingresos: {
    title: "Ingresos a medias",
    body: "Un ingreso se puede dejar sin terminar y retomar desde acá. El paciente aparece en la lista recién cuando confirmás el ingreso.",
  },
  solicitudes: {
    title: "Antes del ingreso",
    body: "Cargá acá a las familias que piden una vacante. Cuando se confirma, «Convertir en ingreso» arma el ingreso guiado con los datos ya cargados.",
  },
  abonos: {
    title: "Los abonos del mes",
    body: "Cada cuota se genera sola con el abono del paciente. Tocá una para registrar un pago (puede ser parcial). Una semana antes del vencimiento te llega un aviso.",
  },
  configuracion: {
    title: "Lo usa toda la residencia",
    body: "El servicio de emergencias que cargues aparece primero en cada ficha de emergencia, con su botón «Llamar».",
  },
  usuarios: {
    title: "Sumá al personal",
    body: "Quien no tiene email entra con un usuario y una contraseña provisoria que le das vos. Desactivar a alguien le corta el acceso al instante.",
  },
  notificaciones: {
    title: "Tus avisos",
    body: "Los avisos no muestran datos de salud: tocá cada uno para ver el detalle, donde rigen los permisos.",
  },
} as const satisfies Record<string, { title: string; body: string }>;

export type TipKey = keyof typeof TIPS;

export const tipKey = (tip: TipKey) => `tip:${tip}`;

/** Claves de la lista "Puesta en marcha" que se marcan a mano. */
export const SETUP_CATALOGS_KEY = "setup:catalogos";
export const SETUP_HIDDEN_KEY = "setup:oculta";
