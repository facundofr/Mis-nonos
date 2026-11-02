"use server";

import { APIError } from "better-auth/api";
import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { parseLoginIdentifier, safeRedirectPath } from "@/lib/auth/identifiers";
import { clientIp, limiters, tooManyAttemptsMessage } from "@/lib/auth/limiters";
import { AUTH_POLICY } from "@/lib/auth/policy";
import { getAuth } from "@/lib/auth/server";

export type LoginState = { error: string } | null;

// Mismo mensaje exista o no la cuenta: no revela quién usa la app.
const INVALID_CREDENTIALS = "El email, el usuario o la contraseña no son correctos.";

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const identifier = parseLoginIdentifier(String(formData.get("identifier") ?? ""));
  const password = String(formData.get("password") ?? "");
  const rememberMe = formData.get("remember") === "on";
  const next = safeRedirectPath(formData.get("next"));

  if (!identifier) return { error: "Escribí tu email o tu usuario." };
  if (!password || password.length > AUTH_POLICY.passwordMaxLength) {
    return { error: "Escribí tu contraseña." };
  }

  const requestHeaders = await headers();
  const accountKey = `${identifier.kind}:${identifier.value}`;
  const ipKey = clientIp(requestHeaders);
  for (const [limiter, key] of [
    [limiters.loginByAccount, accountKey],
    [limiters.loginByIp, ipKey],
  ] as const) {
    const check = limiter.check(key);
    if (!check.allowed) return { error: tooManyAttemptsMessage(check.retryAfterSeconds) };
  }

  const auth = getAuth();
  let needsCode = false;
  try {
    const result =
      identifier.kind === "email"
        ? await auth.api.signInEmail({
            body: { email: identifier.value, password, rememberMe },
            headers: requestHeaders,
          })
        : await auth.api.signInUsername({
            body: { username: identifier.value, password, rememberMe },
            headers: requestHeaders,
          });
    // Con 2FA activado, Better Auth no abre la sesión hasta recibir el código.
    needsCode = "twoFactorRedirect" in result && result.twoFactorRedirect === true;
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    limiters.loginByAccount.recordFailure(accountKey);
    limiters.loginByIp.recordFailure(ipKey);
    return { error: INVALID_CREDENTIALS };
  }
  limiters.loginByAccount.reset(accountKey);

  if (needsCode) {
    redirect(`/ingresar/codigo?volver=${encodeURIComponent(next)}` as Route);
  }
  redirect(next as Route);
}
