/*
 * Content Security Policy estricta con nonce (10.16, F1-STK-07). El nonce
 * cambia en cada pedido (proxy.ts): el navegador solo ejecuta los scripts
 * que lo llevan, que son los de Next.js y el de next-themes. Sin scripts
 * de terceros ni conexiones a otros dominios.
 */

export interface CspOptions {
  nonce: string;
  /** En desarrollo React usa eval y Next.js inyecta estilos y un websocket. */
  development: boolean;
  /** Solo con HTTPS: en http://localhost rompería la carga de recursos. */
  upgradeInsecureRequests: boolean;
}

export function buildContentSecurityPolicy({
  nonce,
  development,
  upgradeInsecureRequests,
}: CspOptions): string {
  const directives: [string, ...string[]][] = [
    ["default-src", "'self'"],
    [
      "script-src",
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(development ? ["'unsafe-eval'"] : []),
    ],
    ["style-src", "'self'", development ? "'unsafe-inline'" : `'nonce-${nonce}'`],
    // blob: para la vista previa de las fotos antes de subirlas; data: para el QR del 2FA.
    ["img-src", "'self'", "blob:", "data:"],
    ["font-src", "'self'"],
    ["connect-src", "'self'", ...(development ? ["ws:"] : [])],
    ["worker-src", "'self'", "blob:"],
    ["manifest-src", "'self'"],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
  ];
  const policy = directives.map((directive) => directive.join(" "));
  if (upgradeInsecureRequests) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

/** Nonce nuevo para un pedido: 128 bits aleatorios en base64. */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
