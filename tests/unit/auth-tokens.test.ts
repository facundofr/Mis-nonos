import { describe, expect, it } from "vitest";

import { invitationState } from "@/lib/auth/invitations";
import { AttemptLimiter } from "@/lib/auth/rate-limit";
import { generateToken, hashToken, isWellFormedToken } from "@/lib/auth/tokens";

describe("tokens de enlaces", () => {
  it("genera 256 bits en base64url y son distintos cada vez", () => {
    const token = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(isWellFormedToken(token)).toBe(true);
    expect(generateToken()).not.toBe(token);
  });

  it("guarda solo el SHA-256 en hexadecimal", () => {
    // Vector conocido de SHA-256 para "abc".
    expect(hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(hashToken(generateToken())).toMatch(/^[0-9a-f]{64}$/);
  });

  it("descarta sin consultar la base lo que no puede ser un token", () => {
    expect(isWellFormedToken("")).toBe(false);
    expect(isWellFormedToken("../../etc")).toBe(false);
    expect(isWellFormedToken("a".repeat(44))).toBe(false);
  });
});

describe("invitationState", () => {
  const now = new Date("2026-11-01T12:00:00.000Z");
  const later = new Date("2026-11-02T12:00:00.000Z");
  const earlier = new Date("2026-10-31T12:00:00.000Z");

  it("distingue pendiente, vencida, aceptada y anulada", () => {
    expect(invitationState({ expiresAt: later, acceptedAt: null, revokedAt: null }, now)).toBe(
      "pending",
    );
    expect(invitationState({ expiresAt: earlier, acceptedAt: null, revokedAt: null }, now)).toBe(
      "expired",
    );
    expect(invitationState({ expiresAt: later, acceptedAt: earlier, revokedAt: null }, now)).toBe(
      "accepted",
    );
    expect(invitationState({ expiresAt: later, acceptedAt: null, revokedAt: earlier }, now)).toBe(
      "revoked",
    );
  });
});

describe("AttemptLimiter", () => {
  const options = { maxFailures: 5, windowSeconds: 15 * 60 };

  it("bloquea después de 5 intentos fallidos en 15 minutos", () => {
    const limiter = new AttemptLimiter(options);
    const start = 1_000_000;
    for (let i = 0; i < 5; i++) {
      expect(limiter.check("cuenta", start).allowed).toBe(true);
      limiter.recordFailure("cuenta", start);
    }
    const blocked = limiter.check("cuenta", start + 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(14 * 60);
  });

  it("vuelve a permitir al terminar la ventana", () => {
    const limiter = new AttemptLimiter(options);
    for (let i = 0; i < 5; i++) limiter.recordFailure("cuenta", 0);
    expect(limiter.check("cuenta", 15 * 60 * 1000).allowed).toBe(true);
  });

  it("un ingreso correcto pone la cuenta en cero y no afecta a otras claves", () => {
    const limiter = new AttemptLimiter(options);
    for (let i = 0; i < 5; i++) {
      limiter.recordFailure("a", 0);
      limiter.recordFailure("b", 0);
    }
    limiter.reset("a");
    expect(limiter.check("a", 1).allowed).toBe(true);
    expect(limiter.check("b", 1).allowed).toBe(false);
  });

  it("no crece sin límite: descarta las claves más viejas", () => {
    const limiter = new AttemptLimiter({ ...options, maxKeys: 2 });
    for (let i = 0; i < 5; i++) limiter.recordFailure("vieja", 0);
    limiter.recordFailure("nueva-1", 0);
    limiter.recordFailure("nueva-2", 0);
    expect(limiter.check("vieja", 1).allowed).toBe(true);
  });
});
