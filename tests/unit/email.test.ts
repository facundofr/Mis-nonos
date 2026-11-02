import { describe, expect, it } from "vitest";

import { deliverEmail, MemoryEmailSender } from "@/lib/email/senders";
import { escapeHtml, invitationEmail, passwordResetEmail } from "@/lib/email/templates";

describe("emails", () => {
  it("no se envían a los emails técnicos del personal sin email", async () => {
    const sender = new MemoryEmailSender();
    const message = passwordResetEmail({
      to: "maria@sin-email.invalid",
      name: "María",
      url: "http://localhost:3000/restablecer?token=x",
    });
    expect(await deliverEmail(sender, message)).toBe(false);
    expect(sender.sent).toHaveLength(0);
  });

  it("se envían a un email real, con el enlace en el texto", async () => {
    const sender = new MemoryEmailSender();
    const url = "http://localhost:3000/restablecer?token=abc";
    expect(await deliverEmail(sender, passwordResetEmail({ to: "a@ejemplo.com", name: "A", url })));
    expect(sender.sent[0]?.text).toContain(url);
    expect(sender.sent[0]?.text).toMatch(/30 minutos/);
  });

  it("escapan el HTML de los nombres", () => {
    const message = invitationEmail({
      to: "a@ejemplo.com",
      name: "<script>alert(1)</script>",
      organizationName: "Residencia & Cía",
      roleName: "Cuidador/a",
      url: "http://localhost:3000/invitacion/abc",
    });
    expect(message.html).not.toContain("<script>");
    expect(message.html).toContain("&lt;script&gt;");
    expect(message.html).toContain("Residencia &amp; Cía");
    expect(message.text).toMatch(/72 horas/);
  });

  it("escapeHtml cubre comillas", () => {
    expect(escapeHtml(`"'`)).toBe("&quot;&#39;");
  });
});
