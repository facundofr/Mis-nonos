"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { z } from "zod";

import { clientIp, limiters, tooManyAttemptsMessage } from "@/lib/auth/limiters";
import { getAuth } from "@/lib/auth/server";

export type RecoverState = { sent: true } | { error: string } | null;

const emailSchema = z.email();

export async function requestPasswordResetAction(
  _previous: RecoverState,
  formData: FormData,
): Promise<RecoverState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!emailSchema.safeParse(email).success) return { error: "Escribí un email válido." };

  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders);
  for (const [limiter, key] of [
    [limiters.resetByEmail, email],
    [limiters.resetByIp, ip],
  ] as const) {
    const check = limiter.check(key);
    if (!check.allowed) return { error: tooManyAttemptsMessage(check.retryAfterSeconds) };
  }
  // Cada pedido cuenta, exista o no el email: evita llenar una casilla de mensajes.
  limiters.resetByEmail.recordFailure(email);
  limiters.resetByIp.recordFailure(ip);

  try {
    await getAuth().api.requestPasswordReset({
      body: { email, redirectTo: "/restablecer" },
      headers: requestHeaders,
    });
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
  }
  // Misma respuesta exista o no la cuenta (diseño Recuperar.dc.html).
  return { sent: true };
}
