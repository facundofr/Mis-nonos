import "server-only";

import { AUTH_POLICY } from "./policy";
import { AttemptLimiter } from "./rate-limit";

function createLimiters() {
  const windowSeconds = AUTH_POLICY.loginWindowSeconds;
  return {
    /** Contraseña incorrecta, por cuenta: 5 cada 15 minutos (sección 10.14). */
    loginByAccount: new AttemptLimiter({
      maxFailures: AUTH_POLICY.loginFailuresPerAccount,
      windowSeconds,
    }),
    /** Contraseña incorrecta, por IP (respaldo). */
    loginByIp: new AttemptLimiter({ maxFailures: AUTH_POLICY.loginFailuresPerIp, windowSeconds }),
    /** Pedidos de enlace de recuperación: cada pedido cuenta. */
    resetByEmail: new AttemptLimiter({ maxFailures: 3, windowSeconds }),
    resetByIp: new AttemptLimiter({ maxFailures: 10, windowSeconds }),
    /** Códigos 2FA y enlaces con token mal usados, por IP. */
    codesByIp: new AttemptLimiter({ maxFailures: 10, windowSeconds }),
    /** Escrituras por persona: tope por minuto (10.14). Cuenta cada envío. */
    writesByUser: new AttemptLimiter({ maxFailures: 60, windowSeconds: 60 }),
  };
}

const globalForLimiters = globalThis as unknown as {
  residencia360Limiters?: ReturnType<typeof createLimiters>;
};

export const limiters = (globalForLimiters.residencia360Limiters ??= createLimiters());

/**
 * IP del cliente. En producción la app está detrás del proxy (Caddy), que
 * escribe X-Forwarded-For y descarta el que manda el cliente (Etapa 2.6).
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "local";
}

/** Mensaje para cuando se superó un límite. */
export function tooManyAttemptsMessage(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Demasiados intentos. Esperá ${minutes} ${minutes === 1 ? "minuto" : "minutos"} y volvé a probar.`;
}
