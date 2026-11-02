/*
 * Nombres de las cookies de Better Auth. Módulo sin dependencias: lo usa
 * proxy.ts, que corre en cada pedido.
 */

/** Prefijo de las cookies: `r360.session_token` (y `__Secure-` en HTTPS). */
export const AUTH_COOKIE_PREFIX = "r360";

function withSecureVariant(name: string): readonly [string, string] {
  return [`${AUTH_COOKIE_PREFIX}.${name}`, `__Secure-${AUTH_COOKIE_PREFIX}.${name}`];
}

export const SESSION_COOKIE_NAMES = withSecureVariant("session_token");

/** Queda entre la contraseña y el código del 2FA (10 minutos). */
export const TWO_FACTOR_COOKIE_NAMES = withSecureVariant("two_factor");
