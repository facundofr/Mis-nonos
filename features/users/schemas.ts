import { z } from "zod";

import { isValidUsername, normalizeUsername } from "@/lib/auth/identifiers";
import { ASSIGNABLE_ROLES, AUTH_POLICY, SYSTEM_ROLES, type SystemRoleKey } from "@/lib/auth/policy";

/*
 * Validación de los formularios de usuarios (F1-USR-01, F1-USR-02). Los
 * mismos esquemas corren en el servidor; el navegador solo ayuda.
 */

const text = (label: string, max: number) =>
  z.string().trim().min(2, `Escribí ${label}.`).max(max, `Como máximo ${max} caracteres.`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Como máximo ${max} caracteres.`)
    .transform((value) => value || null);

const phone = z
  .string()
  .trim()
  .max(30, "Como máximo 30 caracteres.")
  .refine((value) => value === "" || /^[0-9+()\-\s]{6,30}$/.test(value), "Revisá el teléfono.")
  .transform((value) => value || null);

const ROLE_KEYS = SYSTEM_ROLES.map((role) => role.key) as [SystemRoleKey, ...SystemRoleKey[]];

/** Al dar de alta solo se eligen los roles asignables: Master no (docs/decisions/0021). */
export const roleKeySchema = z.enum(ASSIGNABLE_ROLES, { message: "Elegí un rol." });
/** Al editar llega también "master", pero el servicio no deja asignarlo. */
const anyRoleKeySchema = z.enum(ROLE_KEYS, { message: "Elegí un rol." });

/** Qué puede hacer cada rol, en palabras (matriz de lib/auth/permissions.ts). */
export const ROLE_DESCRIPTIONS: Record<SystemRoleKey, string> = {
  asistente:
    "Ve a los pacientes y su ficha de emergencia, y ficha con el QR. No carga ni edita nada.",
  profesional:
    "Escribe novedades y atenciones, hace el traspaso de turno y registra emergencias. No edita datos.",
  admin: "Todo: pacientes, ingresos, cuotas, personal, usuarios y configuración.",
  master: "Lo mismo que Administración, más el registro completo de cambios.",
};

/** Profesional lleva su profesión escrita a mano (Kinesiólogo, Médica, Nutricionista…). */
function requireProfession(
  value: { roleKey: string; profession: string | null },
  ctx: z.RefinementCtx,
) {
  if (value.roleKey === "profesional" && !value.profession) {
    ctx.addIssue({
      code: "custom",
      path: ["profession"],
      message: "Escribí la profesión, por ejemplo Kinesiólogo.",
    });
  }
}

const password = z
  .string()
  .min(AUTH_POLICY.passwordMinLength, `Al menos ${AUTH_POLICY.passwordMinLength} caracteres.`)
  .max(AUTH_POLICY.passwordMaxLength, `Como máximo ${AUTH_POLICY.passwordMaxLength} caracteres.`);

export const inviteSchema = z
  .object({
    name: text("el nombre y apellido", 120),
    email: z.string().trim().toLowerCase().pipe(z.email("Revisá el email.")),
    roleKey: roleKeySchema,
    phone,
    profession: optionalText(60),
    licenseNumber: optionalText(40),
  })
  .superRefine(requireProfession);
export type InviteInput = z.infer<typeof inviteSchema>;

export const createWithoutEmailSchema = z
  .object({
    name: text("el nombre y apellido", 120),
    username: z
      .string()
      .transform(normalizeUsername)
      .refine(
        isValidUsername,
        "De 3 a 30 caracteres: letras minúsculas, números, punto o guion bajo.",
      ),
    roleKey: roleKeySchema,
    phone,
    profession: optionalText(60),
    licenseNumber: optionalText(40),
    temporaryPassword: password,
  })
  .superRefine(requireProfession);
export type CreateWithoutEmailInput = z.infer<typeof createWithoutEmailSchema>;

export const updateMemberSchema = z
  .object({
    roleKey: anyRoleKeySchema,
    phone,
    profession: optionalText(60),
    licenseNumber: optionalText(40),
    usualShiftId: z
      .string()
      .trim()
      .refine((value) => value === "" || z.uuid().safeParse(value).success, "Elegí un turno.")
      .transform((value) => value || null),
  })
  .superRefine(requireProfession);
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

export const profileSchema = z.object({
  name: text("tu nombre y apellido", 120),
  phone,
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Escribí tu contraseña actual."),
    password,
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden.",
  })
  .refine((value) => value.password !== value.currentPassword, {
    path: ["password"],
    message: "La contraseña nueva tiene que ser distinta de la actual.",
  });

export const temporaryPasswordSchema = z.object({ temporaryPassword: password });
