"use server";

import { APIError } from "better-auth/api";
import { and, eq, ne } from "drizzle-orm";
import { refresh, revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import * as schema from "@/db/schema";
import { passwordChangeSchema, profileSchema } from "@/features/users/schemas";
import { updateOwnProfile } from "@/features/users/service";
import { inTenant, runAction } from "@/lib/actions";
import { recordAudit } from "@/lib/audit";
import { getAuth } from "@/lib/auth/server";
import { fieldErrorsFrom, formValues, type FormState } from "@/lib/forms";

export async function updateProfileAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  return runAction(
    null,
    async (context) => {
      await inTenant(context, (tx) => updateOwnProfile(tx, context.tenant, parsed.data));
      refresh();
      return { success: "Tus datos quedaron guardados.", values };
    },
    { values },
  );
}

/**
 * Cambio de contraseña: desde el perfil o, si la contraseña es provisoria
 * (DC-11), antes de poder usar la app. Cierra las demás sesiones.
 */
export async function changePasswordAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = passwordChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  const forced = formData.get("forced") === "1";

  const result = await runAction(
    null,
    async (context) => {
      try {
        await getAuth().api.changePassword({
          body: {
            currentPassword: parsed.data.currentPassword,
            newPassword: parsed.data.password,
            revokeOtherSessions: false,
          },
          headers: await headers(),
        });
      } catch (error) {
        if (error instanceof APIError) {
          return { fieldErrors: { currentPassword: "La contraseña actual no es correcta." } };
        }
        throw error;
      }

      await inTenant(context, async (tx) => {
        await tx
          .update(schema.users)
          .set({ passwordChangeRequired: false })
          .where(eq(schema.users.id, context.user.id));
        // Las demás sesiones (otros teléfonos) se cierran; esta sigue abierta.
        await tx
          .delete(schema.sessions)
          .where(
            and(
              eq(schema.sessions.userId, context.user.id),
              ne(schema.sessions.id, context.session.id),
            ),
          );
        await recordAudit(tx, context.tenant, {
          action: "user.password_changed",
          entityType: "user",
          entityId: context.user.id,
          metadata: { obligatorio: forced },
        });
      });
      return { success: "Tu contraseña quedó cambiada. Cerramos tus otras sesiones." };
    },
    { allowPendingGates: forced },
  );

  if (forced && result?.success) {
    // Se cumplió el paso obligatorio: el marco de la app se vuelve a armar.
    revalidatePath("/", "layout");
    redirect("/inicio");
  }
  return result;
}
