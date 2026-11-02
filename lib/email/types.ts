export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Interfaz de envío (sección 10.10): cambiar de proveedor no toca la app.
 * Implementaciones: SMTP (lib/email/smtp.ts), consola y memoria (senders.ts).
 */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
