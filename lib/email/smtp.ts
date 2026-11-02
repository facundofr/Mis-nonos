import { createTransport } from "nodemailer";

import type { EmailConfig } from "./config";
import type { EmailMessage, EmailSender } from "./types";

/** Lo único que se usa del transporte de nodemailer (permite probarlo sin red). */
export interface MailTransport {
  sendMail(mail: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<unknown>;
}

/**
 * Envío por SMTP (nodemailer). El proveedor del VPS se configura con
 * variables de entorno; cambiarlo no toca la app (sección 10.10).
 */
export class SmtpEmailSender implements EmailSender {
  readonly #transport: MailTransport;
  readonly #from: string;

  constructor(transport: MailTransport, from: string) {
    this.#transport = transport;
    this.#from = from;
  }

  static fromConfig(config: Extract<EmailConfig, { kind: "smtp" }>): SmtpEmailSender {
    const transport = createTransport({
      host: config.host,
      port: config.port,
      // tls: cifrado desde el inicio (465); starttls: se exige subir a TLS (587).
      secure: config.security === "tls",
      requireTLS: config.security === "starttls",
      ignoreTLS: config.security === "none",
      auth: config.user ? { user: config.user, pass: config.password } : undefined,
      // Que un proveedor lento no deje colgado un pedido de la app.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    return new SmtpEmailSender(transport, config.from);
  }

  async send(message: EmailMessage): Promise<void> {
    await this.#transport.sendMail({
      from: this.#from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
