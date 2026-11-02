"use server";

import { APIError } from "better-auth/api";
import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { safeRedirectPath } from "@/lib/auth/identifiers";
import { clientIp, limiters, tooManyAttemptsMessage } from "@/lib/auth/limiters";
import { getAuth } from "@/lib/auth/server";

export type TwoFactorState = { error: string } | null;

export async function verifyTwoFactorAction(
  _previous: TwoFactorState,
  formData: FormData,
): Promise<TwoFactorState> {
  const mode = formData.get("mode") === "backup" ? "backup" : "totp";
  const code = String(formData.get("code") ?? "").replace(/\s+/g, "");
  const next = safeRedirectPath(formData.get("next"));

  if (mode === "totp" && !/^\d{6}$/.test(code)) {
    return { error: "El código tiene 6 números." };
  }
  if (mode === "backup" && !/^[A-Za-z0-9-]{6,32}$/.test(code)) {
    return { error: "Revisá el código de respaldo." };
  }

  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders);
  const check = limiters.codesByIp.check(ip);
  if (!check.allowed) return { error: tooManyAttemptsMessage(check.retryAfterSeconds) };

  try {
    // Better Auth valida el código contra la cookie que dejó al verificar la
    // contraseña, y recién ahí abre la sesión.
    if (mode === "totp") {
      await getAuth().api.verifyTOTP({ body: { code }, headers: requestHeaders });
    } else {
      await getAuth().api.verifyBackupCode({ body: { code }, headers: requestHeaders });
    }
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    limiters.codesByIp.recordFailure(ip);
    const reason = (error.body as { code?: string } | undefined)?.code;
    if (reason === "INVALID_TWO_FACTOR_COOKIE" || reason === "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE") {
      redirect("/ingresar?motivo=codigo-vencido");
    }
    if (reason === "ACCOUNT_TEMPORARILY_LOCKED") {
      return { error: "Demasiados códigos incorrectos. Esperá 15 minutos y volvé a ingresar." };
    }
    return {
      error:
        mode === "totp"
          ? "El código no es correcto. Revisá que la hora del teléfono esté bien y probá con el siguiente."
          : "El código de respaldo no es correcto o ya se usó.",
    };
  }

  redirect(next as Route);
}
