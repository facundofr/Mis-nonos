"use server";

import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { renderSVG } from "uqr";

import { clientIp, limiters, tooManyAttemptsMessage } from "@/lib/auth/limiters";
import { getAuth } from "@/lib/auth/server";
import { requireAppContextForTwoFactorSetup } from "@/lib/auth/session";

export type SetupState =
  { error: string } | { qrSvg: string; secret: string; backupCodes: string[] } | null;

/** Paso 1: confirma la contraseña y genera el secreto, el QR y los códigos de respaldo. */
export async function startTwoFactorSetupAction(
  _previous: SetupState,
  formData: FormData,
): Promise<SetupState> {
  const { user } = await requireAppContextForTwoFactorSetup();
  if (user.twoFactorEnabled) redirect("/inicio");

  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Escribí tu contraseña." };

  const accountKey = `user:${user.id}`;
  const check = limiters.loginByAccount.check(accountKey);
  if (!check.allowed) return { error: tooManyAttemptsMessage(check.retryAfterSeconds) };

  try {
    const result = await getAuth().api.enableTwoFactor({
      body: { password, method: "totp" },
      headers: await headers(),
    });
    if (result.method !== "totp" || !result.totpURI) {
      return { error: "No se pudo iniciar la configuración. Probá de nuevo." };
    }
    const secret = new URL(result.totpURI).searchParams.get("secret") ?? "";
    return {
      qrSvg: renderSVG(result.totpURI, { border: 2 }),
      secret,
      backupCodes: result.backupCodes ?? [],
    };
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    limiters.loginByAccount.recordFailure(accountKey);
    return { error: "La contraseña no es correcta." };
  }
}

export type ConfirmState = { error: string } | null;

/** Paso 2: el primer código correcto activa el 2FA. */
export async function confirmTwoFactorAction(
  _previous: ConfirmState,
  formData: FormData,
): Promise<ConfirmState> {
  await requireAppContextForTwoFactorSetup();
  const code = String(formData.get("code") ?? "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) return { error: "El código tiene 6 números." };

  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders);
  const check = limiters.codesByIp.check(ip);
  if (!check.allowed) return { error: tooManyAttemptsMessage(check.retryAfterSeconds) };

  try {
    await getAuth().api.verifyTOTP({ body: { code }, headers: requestHeaders });
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    limiters.codesByIp.recordFailure(ip);
    return {
      error:
        "El código no es correcto. Revisá que la hora del teléfono esté bien y probá con el siguiente.",
    };
  }
  // Se cumplió el paso obligatorio: el marco de la app se vuelve a armar
  // (deja el marco mínimo y muestra la navegación y la guía).
  revalidatePath("/", "layout");
  redirect("/inicio");
}
