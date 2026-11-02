"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  acceptInvitationAsExistingUser,
  acceptInvitationAsNewUser,
  type AcceptInvitationResult,
} from "@/lib/auth/invitations";
import { clientIp, limiters, tooManyAttemptsMessage } from "@/lib/auth/limiters";
import { checkNewPassword } from "@/lib/auth/passwords";
import { getAuth, hashPassword } from "@/lib/auth/server";
import { requireSession, setActiveOrganization } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export type AcceptState = { error: string } | null;

const REASONS: Record<Exclude<AcceptInvitationResult, { ok: true }>["reason"], string> = {
  invalid: "Este enlace de invitación ya no es válido.",
  expired: "La invitación venció. Pedile a la administración que te mande una nueva.",
  accepted: "Esta invitación ya se usó. Ingresá con tu email y tu contraseña.",
  revoked: "Esta invitación se anuló. Hablá con la administración.",
  "account-exists": "Ya hay una cuenta con este email. Ingresá y volvé a abrir el enlace.",
  "email-mismatch": "La invitación es para otro email. Salí e ingresá con el email invitado.",
};

/** Crea la cuenta de quien recibió la invitación e ingresa. */
export async function acceptInvitationAction(
  _previous: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  const token = String(formData.get("token") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (name.length < 2 || name.length > 120) return { error: "Escribí tu nombre y apellido." };
  const problem = checkNewPassword(password, String(formData.get("confirm") ?? ""));
  if (problem) return { error: problem };

  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders);
  const check = limiters.codesByIp.check(ip);
  if (!check.allowed) return { error: tooManyAttemptsMessage(check.retryAfterSeconds) };

  const result = await acceptInvitationAsNewUser(getDb(), { token, name, password, hashPassword });
  if (!result.ok) {
    limiters.codesByIp.recordFailure(ip);
    return { error: REASONS[result.reason] };
  }

  try {
    // Primer ingreso con la contraseña recién creada, sin "Mantener sesión".
    await getAuth().api.signInEmail({
      body: { email: result.email, password, rememberMe: false },
      headers: requestHeaders,
    });
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
    redirect("/ingresar");
  }
  redirect("/inicio");
}

/** Suma a la residencia a alguien que ya tiene cuenta y ya ingresó. */
export async function acceptInvitationAsCurrentUserAction(
  _previous: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  const current = await requireSession();
  const result = await acceptInvitationAsExistingUser(getDb(), {
    token: String(formData.get("token") ?? ""),
    userId: current.user.id,
    userEmail: current.user.email,
  });
  if (!result.ok) return { error: REASONS[result.reason] };
  await setActiveOrganization(current.session.id, result.organizationId);
  redirect("/inicio");
}
