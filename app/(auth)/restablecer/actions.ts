"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { checkNewPassword } from "@/lib/auth/passwords";
import { clientIp, limiters, tooManyAttemptsMessage } from "@/lib/auth/limiters";
import { getAuth } from "@/lib/auth/server";

export type ResetState = { error: string; linkExpired?: boolean } | null;

export async function resetPasswordAction(
  _previous: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const problem = checkNewPassword(password, String(formData.get("confirm") ?? ""));
  if (problem) return { error: problem };

  const ip = clientIp(await headers());
  const check = limiters.codesByIp.check(ip);
  if (!check.allowed) return { error: tooManyAttemptsMessage(check.retryAfterSeconds) };

  try {
    // También cierra las sesiones abiertas de la cuenta (revokeSessionsOnPasswordReset).
    await getAuth().api.resetPassword({ body: { token, newPassword: password } });
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    limiters.codesByIp.recordFailure(ip);
    return { error: "El enlace no es válido o ya venció. Pedí uno nuevo.", linkExpired: true };
  }
  redirect("/ingresar?motivo=contrasena-actualizada");
}
