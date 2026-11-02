import { AUTH_POLICY } from "./policy";

/**
 * Revisa una contraseña nueva y su confirmación. Devuelve el problema, o
 * null si está bien. Better Auth vuelve a validar el largo.
 */
export function checkNewPassword(password: string, confirmation: string): string | null {
  if (password.length < AUTH_POLICY.passwordMinLength) {
    return `La contraseña tiene que tener al menos ${AUTH_POLICY.passwordMinLength} caracteres.`;
  }
  if (password.length > AUTH_POLICY.passwordMaxLength) {
    return `La contraseña puede tener hasta ${AUTH_POLICY.passwordMaxLength} caracteres.`;
  }
  if (password.trim().length === 0) return "La contraseña no puede ser solo espacios.";
  if (password !== confirmation) return "Las contraseñas no coinciden.";
  return null;
}
