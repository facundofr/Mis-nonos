/*
 * Cómo se muestran los datos de un paciente. Sin dependencias del servidor:
 * lo usan las pantallas, el PDF y las pruebas.
 */

/** Edad cumplida a una fecha (AAAA-MM-DD). */
export function ageOn(birthDate: string | null, today: string): number | null {
  if (!birthDate) return null;
  const [by, bm, bd] = birthDate.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = today.split("-").map(Number) as [number, number, number];
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age >= 0 ? age : null;
}

export function fullName(resident: { firstName: string; lastName: string }): string {
  return `${resident.firstName} ${resident.lastName}`;
}

/** DNI con puntos: 4512778 → 4.512.778. */
export function formatNationalId(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Número para un enlace tel: (solo dígitos y +). */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** Enlace de WhatsApp para un celular argentino (sin datos en el mensaje). */
export function whatsappHref(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!digits.startsWith("54")) digits = `549${digits}`;
  return `https://wa.me/${digits}`;
}

export const STATUS_LABELS = {
  admission_draft: "Ingreso en curso",
  admission_cancelled: "Ingreso cancelado",
  active: "Activo",
  hospitalized: "Internado fuera",
  discharged: "Egresado",
} as const;
