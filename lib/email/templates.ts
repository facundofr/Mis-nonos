import { BRAND } from "@/lib/brand";

import type { EmailMessage } from "./types";

/*
 * Textos de los emails. Llevan solo lo necesario: nunca datos de residentes
 * (sección 12.10).
 */

export function passwordResetEmail(input: { to: string; name: string; url: string }): EmailMessage {
  const subject = `Crear una nueva contraseña en ${BRAND.appName}`;
  const text = [
    `Hola, ${input.name}:`,
    "",
    "Pediste crear una nueva contraseña. Abrí este enlace (vence en 30 minutos):",
    input.url,
    "",
    "Si no lo pediste, ignorá este email: tu contraseña sigue igual.",
  ].join("\n");
  const html = layout(
    `<p>Hola, ${escapeHtml(input.name)}:</p>
     <p>Pediste crear una nueva contraseña. El enlace vence en 30 minutos.</p>
     ${button(input.url, "Crear contraseña")}
     <p>Si no lo pediste, ignorá este email: tu contraseña sigue igual.</p>`,
  );
  return { to: input.to, subject, text, html };
}

export function invitationEmail(input: {
  to: string;
  name: string;
  organizationName: string;
  roleName: string;
  url: string;
}): EmailMessage {
  const subject = `Te invitaron a ${BRAND.appName}`;
  const text = [
    `Hola, ${input.name}:`,
    "",
    `Te invitaron a usar ${BRAND.appName} en ${input.organizationName}, con el rol ${input.roleName}.`,
    "Para crear tu contraseña, abrí este enlace (vence en 72 horas):",
    input.url,
    "",
    "Si no esperabas esta invitación, ignorá este email.",
  ].join("\n");
  const html = layout(
    `<p>Hola, ${escapeHtml(input.name)}:</p>
     <p>Te invitaron a usar ${escapeHtml(BRAND.appName)} en
        <strong>${escapeHtml(input.organizationName)}</strong>, con el rol
        ${escapeHtml(input.roleName)}. El enlace vence en 72 horas.</p>
     ${button(input.url, "Crear mi contraseña")}
     <p>Si no esperabas esta invitación, ignorá este email.</p>`,
  );
  return { to: input.to, subject, text, html };
}

function layout(body: string): string {
  return `<!doctype html><html lang="es"><body style="margin:0;padding:24px;background:#f7faf9;font-family:system-ui,sans-serif;color:#16201e;line-height:1.5">
<div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #dfe6e3;border-radius:12px;padding:24px">
<p style="margin:0 0 16px;font-weight:600;color:#863a2a">${escapeHtml(BRAND.appName)}</p>
${body}
</div></body></html>`;
}

function button(url: string, label: string): string {
  return `<p><a href="${escapeHtml(url)}" style="display:inline-block;background:#fa8072;color:#1f0f0b;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${escapeHtml(label)}</a></p>
<p style="font-size:13px;color:#57625f">Si el botón no funciona, copiá este enlace: ${escapeHtml(url)}</p>`;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Resumen diario de vencimientos del abono (7.3-C4, 12.10): solo cuántas
 * cuotas vencen, sin nombres ni montos, con enlace a la app.
 */
export function feeDueSoonDigestEmail(input: {
  to: string;
  name: string;
  count: number;
  days: number;
  url: string;
}): EmailMessage {
  const cuotas =
    input.count === 1 ? "1 cuota del abono vence" : `${input.count} cuotas del abono vencen`;
  const subject = `${cuotas} en los próximos ${input.days} días`;
  const text = [
    `Hola, ${input.name}:`,
    "",
    `${cuotas} en los próximos ${input.days} días y todavía no están pagas.`,
    "Entrá a la app para ver el detalle:",
    input.url,
  ].join("\n");
  const html = layout(
    `<p>Hola, ${escapeHtml(input.name)}:</p>
     <p>${escapeHtml(cuotas)} en los próximos ${input.days} días y todavía no están pagas.</p>
     ${button(input.url, "Ver los abonos")}`,
  );
  return { to: input.to, subject, text, html };
}

/**
 * Acuse a la familia que mandó el formulario público (DC-16, 12.9):
 * genérico, sin datos del futuro residente. Solo se manda si dejó un email.
 */
export function admissionRequestReceivedEmail(input: {
  to: string;
  siteName: string;
}): EmailMessage {
  const subject = `Recibimos tu solicitud · ${input.siteName}`;
  const text = [
    "Hola:",
    "",
    `Recibimos tu solicitud de ingreso en ${input.siteName}. Alguien de la residencia te va a llamar en los próximos días.`,
    "",
    "Si no la mandaste vos, podés ignorar este email.",
  ].join("\n");
  const html = layout(
    `<p>Hola:</p>
     <p>Recibimos tu solicitud de ingreso en ${escapeHtml(input.siteName)}. Alguien de la residencia te va a llamar en los próximos días.</p>
     <p>Si no la mandaste vos, podés ignorar este email.</p>`,
  );
  return { to: input.to, subject, text, html };
}
