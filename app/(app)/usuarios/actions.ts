"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { listAssignableRoles } from "@/features/users/queries";
import {
  createWithoutEmailSchema,
  inviteSchema,
  temporaryPasswordSchema,
  updateMemberSchema,
} from "@/features/users/schemas";
import {
  createMemberWithoutEmail,
  inviteMember,
  resendInvitation,
  resetTemporaryPassword,
  revokeInvitation,
  setMemberActive,
  updateMember,
} from "@/features/users/service";
import { inTenant, runAction } from "@/lib/actions";
import { hashPassword } from "@/lib/auth/server";
import { sendEmail } from "@/lib/email";
import { invitationEmail } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { fieldErrorsFrom, formValues, type FormState } from "@/lib/forms";
import { logger } from "@/lib/logger/server";

export interface InvitationResult {
  link: string;
  email: string;
  emailSent: boolean;
}

const idSchema = z.uuid();

function invitationLink(token: string): string {
  return new URL(`/invitacion/${token}`, env.APP_URL).href;
}

/** Manda el email de invitación; si falla, la invitación igual vale (hay enlace para copiar). */
async function sendInvitation(input: {
  email: string;
  name: string;
  organizationName: string;
  roleName: string;
  link: string;
}): Promise<boolean> {
  try {
    return await sendEmail(
      invitationEmail({
        to: input.email,
        name: input.name,
        organizationName: input.organizationName,
        roleName: input.roleName,
        url: input.link,
      }),
    );
  } catch (error) {
    logger.error({ err: error }, "No se pudo enviar el email de invitación");
    return false;
  }
}

export async function inviteAction(
  _previous: FormState<InvitationResult>,
  formData: FormData,
): Promise<FormState<InvitationResult>> {
  const values = formValues(formData);
  const parsed = inviteSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  return runAction<InvitationResult>(
    "users.manage",
    async (context) => {
      const { invitation, roleName } = await inTenant(context, async (tx) => {
        const created = await inviteMember(tx, context.tenant, parsed.data);
        const roles = await listAssignableRoles(tx);
        return {
          invitation: created,
          roleName: roles.find((role) => role.key === parsed.data.roleKey)?.name ?? "",
        };
      });
      const link = invitationLink(invitation.token);
      const emailSent = await sendInvitation({
        email: parsed.data.email,
        name: parsed.data.name,
        organizationName: context.membership.organizationName,
        roleName,
        link,
      });
      refresh();
      return {
        success: emailSent
          ? `Invitación enviada a ${parsed.data.email}. Vence en 72 horas.`
          : "La invitación quedó creada, pero no se pudo enviar el email: compartí el enlace.",
        data: { link, email: parsed.data.email, emailSent },
      };
    },
    { values },
  );
}

export async function createWithoutEmailAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = createWithoutEmailSchema.safeParse({
    ...values,
    temporaryPassword: formData.get("temporaryPassword"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  const result = await runAction<{ membershipId: string }>(
    "users.manage",
    async (context) => {
      const passwordHash = await hashPassword(parsed.data.temporaryPassword);
      const { temporaryPassword: _omit, ...data } = parsed.data;
      const created = await inTenant(context, (tx) =>
        createMemberWithoutEmail(tx, context.tenant, { ...data, passwordHash }),
      );
      return { data: { membershipId: created.membershipId } };
    },
    { values },
  );
  if (result?.data) redirect(`/usuarios/${result.data.membershipId}?creado=1`);
  return result && { error: result.error, fieldErrors: result.fieldErrors, values: result.values };
}

export async function updateMemberAction(
  membershipId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = updateMemberSchema.safeParse(values);
  if (!parsed.success || !idSchema.safeParse(membershipId).success) {
    return { fieldErrors: parsed.success ? {} : fieldErrorsFrom(parsed.error), values };
  }
  return runAction(
    "users.manage",
    async (context) => {
      await inTenant(context, (tx) => updateMember(tx, context.tenant, membershipId, parsed.data));
      refresh();
      return { success: "Los cambios quedaron guardados.", values };
    },
    { values },
  );
}

export async function setMemberActiveAction(
  membershipId: string,
  active: boolean,
  _previous: FormState,
): Promise<FormState> {
  if (!idSchema.safeParse(membershipId).success) return { error: "Persona inválida." };
  return runAction("users.manage", async (context) => {
    await inTenant(context, (tx) => setMemberActive(tx, context.tenant, membershipId, active));
    refresh();
    return {
      success: active
        ? "La persona vuelve a tener acceso."
        : "La persona ya no puede entrar. Su nombre queda en todo el historial.",
    };
  });
}

export async function resetPasswordAction(
  membershipId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = temporaryPasswordSchema.safeParse({
    temporaryPassword: formData.get("temporaryPassword"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  if (!idSchema.safeParse(membershipId).success) return { error: "Persona inválida." };
  return runAction("users.manage", async (context) => {
    const passwordHash = await hashPassword(parsed.data.temporaryPassword);
    await inTenant(context, (tx) =>
      resetTemporaryPassword(tx, context.tenant, membershipId, passwordHash),
    );
    return {
      success:
        "Contraseña provisoria guardada. Dásela a la persona: al entrar va a tener que elegir una propia.",
    };
  });
}

export async function resendInvitationAction(
  invitationId: string,
  _previous: FormState<InvitationResult>,
): Promise<FormState<InvitationResult>> {
  if (!idSchema.safeParse(invitationId).success) return { error: "Invitación inválida." };
  return runAction<InvitationResult>("users.manage", async (context) => {
    const { created, roleName } = await inTenant(context, async (tx) => {
      const invitation = await resendInvitation(tx, context.tenant, invitationId);
      const roles = await listAssignableRoles(tx);
      return {
        created: invitation,
        roleName: roles.find((role) => role.id === invitation.roleId)?.name ?? "",
      };
    });
    const link = invitationLink(created.token);
    const emailSent = await sendInvitation({
      email: created.email,
      name: created.name,
      organizationName: context.membership.organizationName,
      roleName,
      link,
    });
    refresh();
    return {
      success: emailSent ? `Invitación reenviada a ${created.email}.` : "Invitación renovada.",
      data: { link, email: created.email, emailSent },
    };
  });
}

export async function revokeInvitationAction(
  invitationId: string,
  _previous: FormState,
): Promise<FormState> {
  if (!idSchema.safeParse(invitationId).success) return { error: "Invitación inválida." };
  return runAction("users.manage", async (context) => {
    await inTenant(context, (tx) => revokeInvitation(tx, context.tenant, invitationId));
    refresh();
    return { success: "Invitación anulada." };
  });
}
