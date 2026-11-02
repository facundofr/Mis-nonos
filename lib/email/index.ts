import "server-only";

import { env } from "@/lib/env";

import { resolveEmailConfig } from "./config";
import { ConsoleEmailSender, deliverEmail } from "./senders";
import { SmtpEmailSender } from "./smtp";
import type { EmailMessage, EmailSender } from "./types";

export type { EmailMessage, EmailSender } from "./types";

// En desarrollo, Next.js recarga módulos: se guarda una sola instancia.
const globalForEmail = globalThis as unknown as { residencia360EmailSender?: EmailSender };

/**
 * Proveedor de email del entorno (lib/email/config.ts): SMTP si está
 * configurado; si no, la consola del servidor, solo en desarrollo.
 */
export function getEmailSender(): EmailSender {
  if (!globalForEmail.residencia360EmailSender) {
    const config = resolveEmailConfig(env);
    globalForEmail.residencia360EmailSender =
      config.kind === "smtp" ? SmtpEmailSender.fromConfig(config) : new ConsoleEmailSender();
  }
  return globalForEmail.residencia360EmailSender;
}

/** Envía un email salvo que sea una dirección técnica. Devuelve si se envió. */
export function sendEmail(message: EmailMessage): Promise<boolean> {
  return deliverEmail(getEmailSender(), message);
}
