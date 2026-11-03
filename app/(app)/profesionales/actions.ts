"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import { professionalSchema } from "@/features/care/schemas";
import { createProfessional, updateProfessional } from "@/features/care/service";
import { inTenant, runAction } from "@/lib/actions";
import { fieldErrorsFrom, formValues, type FormState } from "@/lib/forms";

const id = z.uuid();

/** Alta o edición de un profesional (care.manage). */
export async function saveProfessionalAction(
  professionalId: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (professionalId && !id.safeParse(professionalId).success) {
    return { error: "Profesional inválido.", values };
  }
  // Al dar de alta no hay casilla "Activo": empieza activo.
  const parsed = professionalSchema.safeParse(
    professionalId ? values : { ...values, active: "on" },
  );
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  const result = await runAction(
    "care.manage",
    async (context) => {
      await inTenant(context, (tx) =>
        professionalId
          ? updateProfessional(tx, context.tenant, professionalId, parsed.data)
          : createProfessional(tx, context.tenant, parsed.data).then(() => undefined),
      );
      return { success: "ok" };
    },
    { values },
  );
  if (result?.success) {
    redirect((professionalId ? "/profesionales?guardado=1" : "/profesionales?agregado=1") as Route);
  }
  return result;
}
