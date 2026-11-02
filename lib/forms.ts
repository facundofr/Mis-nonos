import type { z } from "zod";

/*
 * Ayudas para formularios con Server Actions y useActionState: el mismo
 * esquema Zod valida en el servidor; los errores vuelven por campo y el
 * formulario conserva lo escrito (10.16).
 */

export type FieldErrors = Partial<Record<string, string>>;

export type FormState<T = undefined> = {
  /** Mensaje general (por ejemplo, una regla de negocio o un error inesperado). */
  error?: string;
  fieldErrors?: FieldErrors;
  /** Mensaje de éxito para mostrar en la misma pantalla. */
  success?: string;
  /** Datos de vuelta para la pantalla (p. ej. un enlace de invitación). */
  data?: T;
  /** Lo que se envió, para no perder lo escrito si algo falla. */
  values?: Record<string, string>;
} | null;

/** Primer mensaje de cada campo. */
export function fieldErrorsFrom(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    result[key] ??= issue.message;
  }
  return result;
}

/**
 * Campos de contraseña (incluida la repetición, "confirm"). Solo esos: un
 * nombre como "handoverRequiresConfirmation" es un dato común.
 */
export function isPasswordField(key: string): boolean {
  return /password|contrasena/i.test(key) || /^confirm(ar)?$/i.test(key);
}

/** Los valores de texto enviados (sin contraseñas), para devolverlos al formulario. */
export function formValues(
  formData: FormData,
  omit: readonly string[] = [],
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string" || key.startsWith("$") || omit.includes(key)) continue;
    if (isPasswordField(key)) continue;
    values[key] = value;
  }
  return values;
}

/** Objeto simple a partir de un FormData (los campos repetidos, como lista). */
export function formObject(formData: FormData): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string" || key.startsWith("$")) continue;
    const current = result[key];
    if (current === undefined) result[key] = value;
    else result[key] = Array.isArray(current) ? [...current, value] : [current, value];
  }
  return result;
}

/** Texto opcional: vacío → null. */
export function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
