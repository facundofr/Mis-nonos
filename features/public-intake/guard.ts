import { createHmac, timingSafeEqual } from "node:crypto";

/*
 * Defensas del formulario público sin captcha (12.9; DC-15: por ahora sin
 * captcha). Además del límite de envíos:
 * - un campo oculto que solo completan los robots;
 * - un sello firmado con la hora en que se abrió el formulario: un envío
 *   demasiado rápido (menos de 3 s) o con un sello falso o vencido se
 *   descarta.
 * Ante un robot la respuesta es la misma que ante un envío correcto, para
 * no darle pistas; simplemente no se guarda nada.
 */

/** Nombre del campo trampa: parece un dato común para un robot. */
export const HONEYPOT_FIELD = "sitioWeb";
export const FORM_TOKEN_FIELD = "sello";

const MIN_FILL_MS = 3_000;
const MAX_AGE_MS = 24 * 3600 * 1000;

function sign(secret: string, issuedAt: number): string {
  return createHmac("sha256", secret).update(`formulario-publico:${issuedAt}`).digest("base64url");
}

/** Sello para un formulario que se abre ahora. */
export function issueFormToken(secret: string, now = Date.now()): string {
  return `${now}.${sign(secret, now)}`;
}

export type FormTokenCheck = "ok" | "invalid" | "too_fast" | "expired";

export function checkFormToken(
  token: string | null | undefined,
  secret: string,
  now = Date.now(),
): FormTokenCheck {
  const [issued, signature] = (token ?? "").split(".");
  const issuedAt = Number(issued);
  if (!signature || !Number.isSafeInteger(issuedAt)) return "invalid";
  const expected = Buffer.from(sign(secret, issuedAt));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return "invalid";
  }
  if (now - issuedAt < MIN_FILL_MS) return "too_fast";
  if (now - issuedAt > MAX_AGE_MS) return "expired";
  return "ok";
}

/** ¿El envío parece de un robot? */
export function looksAutomated(
  formData: FormData,
  secret: string,
  now = Date.now(),
): { automated: boolean; reason: string | null } {
  const honeypot = formData.get(HONEYPOT_FIELD);
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return { automated: true, reason: "honeypot" };
  }
  const token = formData.get(FORM_TOKEN_FIELD);
  const check = checkFormToken(typeof token === "string" ? token : null, secret, now);
  // Un sello vencido es de una persona que dejó la pestaña abierta: no es un robot.
  if (check === "invalid" || check === "too_fast") return { automated: true, reason: check };
  return { automated: false, reason: null };
}
