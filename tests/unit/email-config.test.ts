import { describe, expect, it } from "vitest";

import { resolveEmailConfig } from "@/lib/email/config";
import { deliverEmail } from "@/lib/email/senders";
import { SmtpEmailSender, type MailTransport } from "@/lib/email/smtp";

const base = {
  NODE_ENV: "development" as const,
  SMTP_HOST: undefined,
  SMTP_PORT: 587,
  SMTP_SECURITY: "starttls" as const,
  SMTP_USER: undefined,
  SMTP_PASSWORD: undefined,
  EMAIL_FROM: undefined,
};

describe("resolveEmailConfig", () => {
  it("sin SMTP, en desarrollo usa la consola", () => {
    expect(resolveEmailConfig(base)).toEqual({ kind: "console" });
  });

  it("en producción exige SMTP", () => {
    expect(() => resolveEmailConfig({ ...base, NODE_ENV: "production" })).toThrow(/SMTP_HOST/);
  });

  it("con SMTP exige el remitente", () => {
    expect(() => resolveEmailConfig({ ...base, SMTP_HOST: "localhost" })).toThrow(/EMAIL_FROM/);
  });

  it("en producción no permite SMTP sin cifrar", () => {
    expect(() =>
      resolveEmailConfig({
        ...base,
        NODE_ENV: "production",
        SMTP_HOST: "smtp.ejemplo.com",
        SMTP_SECURITY: "none",
        EMAIL_FROM: "avisos@ejemplo.com",
      }),
    ).toThrow(/SMTP_SECURITY/);
  });

  it("usuario y contraseña van juntos", () => {
    expect(() =>
      resolveEmailConfig({
        ...base,
        SMTP_HOST: "smtp.ejemplo.com",
        SMTP_USER: "avisos",
        EMAIL_FROM: "avisos@ejemplo.com",
      }),
    ).toThrow(/SMTP_USER/);
  });

  it("arma la configuración de Mailpit en desarrollo", () => {
    expect(
      resolveEmailConfig({
        ...base,
        SMTP_HOST: "localhost",
        SMTP_PORT: 1025,
        SMTP_SECURITY: "none",
        EMAIL_FROM: "Mis Nonos <avisos@ejemplo.com>",
      }),
    ).toMatchObject({ kind: "smtp", host: "localhost", port: 1025, security: "none" });
  });
});

describe("SmtpEmailSender", () => {
  it("envía con el remitente configurado", async () => {
    const sent: Parameters<MailTransport["sendMail"]>[0][] = [];
    const sender = new SmtpEmailSender(
      { sendMail: async (mail) => sent.push(mail) },
      "Mis Nonos <avisos@ejemplo.com>",
    );
    await sender.send({
      to: "ana@ejemplo.com",
      subject: "Hola",
      text: "Texto",
      html: "<p>Texto</p>",
    });
    expect(sent).toEqual([
      {
        from: "Mis Nonos <avisos@ejemplo.com>",
        to: "ana@ejemplo.com",
        subject: "Hola",
        text: "Texto",
        html: "<p>Texto</p>",
      },
    ]);
  });

  it("nunca envía a los emails técnicos del personal sin email", async () => {
    const sent: unknown[] = [];
    const sender = new SmtpEmailSender(
      { sendMail: async (mail) => sent.push(mail) },
      "x@ejemplo.com",
    );
    const delivered = await deliverEmail(sender, {
      to: "juan.cuidador@sin-email.invalid",
      subject: "Hola",
      text: "Texto",
      html: "<p>Texto</p>",
    });
    expect(delivered).toBe(false);
    expect(sent).toEqual([]);
  });
});
