import { canReceiveEmail } from "@/lib/auth/identifiers";

import type { EmailMessage, EmailSender } from "./types";

/**
 * Desarrollo: muestra el email en la consola del servidor en lugar de
 * enviarlo. Nunca se usa en producción (lib/email/index.ts).
 */
export class ConsoleEmailSender implements EmailSender {
  async send(message: EmailMessage): Promise<void> {
    console.info(
      `\n[email de desarrollo] Para: ${message.to}\nAsunto: ${message.subject}\n\n${message.text}\n`,
    );
  }
}

/** Pruebas: guarda los emails en memoria para revisarlos. */
export class MemoryEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }
}

/**
 * Envía salvo que la dirección sea un email técnico (personal sin email,
 * DC-11). Devuelve si se envió.
 */
export async function deliverEmail(sender: EmailSender, message: EmailMessage): Promise<boolean> {
  if (!canReceiveEmail(message.to)) return false;
  await sender.send(message);
  return true;
}
