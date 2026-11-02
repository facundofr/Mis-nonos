import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAMES } from "@/lib/auth/cookies";
import { buildContentSecurityPolicy, createNonce } from "@/lib/security/csp";

/*
 * Corre antes de cada pantalla:
 * 1. Sin cookie de sesión, las pantallas de la app llevan al ingreso. Es
 *    solo una primera barrera: la validación real la hacen las páginas y
 *    las Server Actions (lib/auth/session.ts).
 * 2. Fija la Content Security Policy con un nonce nuevo (lib/security/csp.ts),
 *    que Next.js agrega a sus scripts.
 * Las rutas /api/* no pasan por acá: cada una verifica su acceso y tiene
 * su propia CSP (next.config.ts).
 */

// /residencia/<dirección>: landing y formulario público de cada residencia (12.9).
const PUBLIC_PATHS = [
  "/ingresar",
  "/recuperar",
  "/restablecer",
  "/invitacion",
  "/sistema-visual",
  "/residencia",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const hasSession = SESSION_COOKIE_NAMES.some((name) => request.cookies.has(name));
  // En el dominio de la residencia, quien llega a la raíz sin sesión ve la
  // landing (HOME_LANDING_SLUG); el personal entra por /ingresar.
  const landing = process.env.HOME_LANDING_SLUG?.trim().toLowerCase();
  if (pathname === "/" && !hasSession && landing && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(landing)) {
    return NextResponse.redirect(new URL(`/residencia/${landing}`, request.url));
  }
  if (!isPublic(pathname) && !hasSession) {
    const login = new URL("/ingresar", request.url);
    if (pathname !== "/" && pathname !== "/inicio") {
      login.searchParams.set("volver", `${pathname}${search}`);
    }
    return NextResponse.redirect(login);
  }

  const nonce = createNonce();
  const policy = buildContentSecurityPolicy({
    nonce,
    development: process.env.NODE_ENV === "development",
    upgradeInsecureRequests: (process.env.APP_URL ?? "").startsWith("https://"),
  });

  // Next.js lee el nonce de la CSP del pedido; la pantalla, de x-nonce.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api/|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
      // Los prefetch de <Link> no renderizan HTML: no necesitan nonce.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
