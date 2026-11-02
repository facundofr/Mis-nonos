import "server-only";

import { randomBytes } from "node:crypto";

import { cache } from "react";

import { AttemptLimiter } from "@/lib/auth/rate-limit";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";

import { getPublicSite, type PublicSite } from "./service";

/** La landing de esta dirección, una vez por pedido (o null si no está publicada). */
export const loadPublicSite = cache((slug: string): Promise<PublicSite | null> =>
  getPublicSite(getDb(), slug),
);

const globalForIntake = globalThis as unknown as {
  residencia360PublicIntake?: {
    byIp: AttemptLimiter;
    bySite: AttemptLimiter;
    fallbackSecret: string;
  };
};

/*
 * Límites de envíos del formulario público (12.9), en la memoria del
 * proceso como los del ingreso (una sola instancia en el piloto). En el
 * VPS, el proxy (Caddy) suma su propio límite por IP.
 */
const state = (globalForIntake.residencia360PublicIntake ??= {
  /** Por IP: 5 solicitudes por hora alcanzan para una familia. */
  byIp: new AttemptLimiter({ maxFailures: 5, windowSeconds: 3600 }),
  /** Por residencia: 40 por hora, para que un ataque no llene la bandeja. */
  bySite: new AttemptLimiter({ maxFailures: 40, windowSeconds: 3600 }),
  fallbackSecret: randomBytes(32).toString("base64url"),
});

export const publicIntakeLimiters = { byIp: state.byIp, bySite: state.bySite };

/** Clave para firmar el sello del formulario (guard.ts). */
export function formTokenSecret(): string {
  return env.BETTER_AUTH_SECRET ?? state.fallbackSecret;
}
