import type { ServerEnv } from "@/lib/env/schema";

/** Cómo se envían los emails en este entorno. */
export type EmailConfig =
  | { kind: "console" }
  | {
      kind: "smtp";
      host: string;
      port: number;
      security: "starttls" | "tls" | "none";
      user?: string;
      password?: string;
      from: string;
    };

type EmailEnv = Pick<
  ServerEnv,
  | "NODE_ENV"
  | "SMTP_HOST"
  | "SMTP_PORT"
  | "SMTP_SECURITY"
  | "SMTP_USER"
  | "SMTP_PASSWORD"
  | "EMAIL_FROM"
>;

/**
 * Elige el envío según el entorno:
 * - con SMTP_HOST, SMTP (Mailpit en desarrollo; el proveedor real en el VPS);
 * - sin SMTP_HOST, la consola, solo fuera de producción.
 * En producción se exige un canal cifrado: nunca usuario y contraseña en claro.
 */
export function resolveEmailConfig(env: EmailEnv): EmailConfig {
  if (!env.SMTP_HOST) {
    if (env.NODE_ENV === "production") {
      throw new Error("Falta SMTP_HOST: en producción los emails salen por SMTP.");
    }
    return { kind: "console" };
  }
  if (!env.EMAIL_FROM) {
    throw new Error("Falta EMAIL_FROM: el remitente de los emails.");
  }
  if (env.NODE_ENV === "production" && env.SMTP_SECURITY === "none") {
    throw new Error("SMTP_SECURITY=none solo se permite en desarrollo.");
  }
  if (Boolean(env.SMTP_USER) !== Boolean(env.SMTP_PASSWORD)) {
    throw new Error("SMTP_USER y SMTP_PASSWORD van juntos.");
  }
  return {
    kind: "smtp",
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    security: env.SMTP_SECURITY,
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    from: env.EMAIL_FROM,
  };
}
