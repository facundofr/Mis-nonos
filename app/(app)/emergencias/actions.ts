"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import { closeEmergencySchema, emergencySchema } from "@/features/care/schemas";
import { closeEmergency, recordEmergency } from "@/features/care/service";
import { inTenant, runAction } from "@/lib/actions";
import { fieldErrorsFrom, formValues, type FormState } from "@/lib/forms";

const id = z.uuid();

export async function recordEmergencyAction(
  residentId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (!id.safeParse(residentId).success) return { error: "Elegí el paciente.", values };
  const parsed = emergencySchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  let emergencyId = "";
  const result = await runAction(
    "emergencies.manage",
    async (context) => {
      emergencyId = await inTenant(context, (tx) =>
        recordEmergency(tx, context.tenant, { ...parsed.data, residentId }),
      );
      return { success: "ok" };
    },
    { values },
  );
  if (result?.success) redirect(`/emergencias/${emergencyId}?registrada=1` as Route);
  return result;
}

export async function closeEmergencyAction(
  emergencyId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (!id.safeParse(emergencyId).success) return { error: "Emergencia inválida.", values };
  const parsed = closeEmergencySchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  const result = await runAction(
    "emergencies.manage",
    async (context) => {
      await inTenant(context, (tx) => closeEmergency(tx, context.tenant, emergencyId, parsed.data));
      return { success: "ok" };
    },
    { values },
  );
  if (result?.success) redirect(`/emergencias/${emergencyId}?cerrada=1` as Route);
  return result;
}
