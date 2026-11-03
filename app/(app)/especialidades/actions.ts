"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { specialtySchema } from "@/features/care/schemas";
import { createSpecialty, updateSpecialty } from "@/features/care/service";
import { inTenant, runAction } from "@/lib/actions";
import { fieldErrorsFrom, formValues, type FormState } from "@/lib/forms";

const id = z.uuid();

/** Alta o edición de una especialidad (care.manage). */
export async function saveSpecialtyAction(
  specialtyId: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (specialtyId && !id.safeParse(specialtyId).success) {
    return { error: "Especialidad inválida.", values };
  }
  const parsed = specialtySchema.safeParse(specialtyId ? values : { ...values, active: "on" });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  return runAction(
    "care.manage",
    async (context) => {
      await inTenant(context, (tx) =>
        specialtyId
          ? updateSpecialty(tx, context.tenant, specialtyId, parsed.data)
          : createSpecialty(tx, context.tenant, parsed.data).then(() => undefined),
      );
      refresh();
      return { success: specialtyId ? "Cambios guardados." : "Especialidad agregada." };
    },
    { values },
  );
}
