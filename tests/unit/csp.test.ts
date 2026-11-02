import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy, createNonce } from "@/lib/security/csp";

function directives(policy: string): Map<string, string[]> {
  return new Map(
    policy.split("; ").map((directive) => {
      const [name = "", ...values] = directive.split(" ");
      return [name, values];
    }),
  );
}

describe("Content Security Policy", () => {
  it("en producción: scripts y estilos solo con nonce, sin eval ni inline", () => {
    const policy = directives(
      buildContentSecurityPolicy({
        nonce: "abc",
        development: false,
        upgradeInsecureRequests: true,
      }),
    );
    expect(policy.get("script-src")).toEqual(["'self'", "'nonce-abc'", "'strict-dynamic'"]);
    expect(policy.get("style-src")).toEqual(["'self'", "'nonce-abc'"]);
    expect(policy.get("frame-ancestors")).toEqual(["'none'"]);
    expect(policy.get("object-src")).toEqual(["'none'"]);
    expect(policy.get("connect-src")).toEqual(["'self'"]);
    expect(policy.has("upgrade-insecure-requests")).toBe(true);
    expect([...policy.values()].flat()).not.toContain("'unsafe-inline'");
    expect([...policy.values()].flat()).not.toContain("'unsafe-eval'");
  });

  it("en desarrollo permite lo que necesita Next.js y no fuerza HTTPS", () => {
    const policy = directives(
      buildContentSecurityPolicy({
        nonce: "abc",
        development: true,
        upgradeInsecureRequests: false,
      }),
    );
    expect(policy.get("script-src")).toContain("'unsafe-eval'");
    expect(policy.get("style-src")).toContain("'unsafe-inline'");
    expect(policy.has("upgrade-insecure-requests")).toBe(false);
  });

  it("cada nonce es distinto y tiene 128 bits", () => {
    const first = createNonce();
    expect(first).not.toBe(createNonce());
    expect(Buffer.from(first, "base64")).toHaveLength(16);
  });
});
