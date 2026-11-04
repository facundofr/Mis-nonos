"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import { encounterSchema, voidEncounterSchema } from "@/features/care/schemas";
import { recordEncounter, voidEncounter } from "@/features/care/service";
import { inTenant, runAction } from "@/lib/actions";
import { fieldErrorsFrom, formValues, type FormState } from "@/lib/forms";

const id = z.uuid();

/** Adónde vuelve "Registrar atención" al guardar. */
export type EncounterReturn = "especialidad" | "atencion";

export async function recordEncounterAction(
  residentId: string,
  back: EncounterReturn,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (!id.safeParse(residentId).success) return { error: "Elegí el paciente.", values };
  const parsed = encounterSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };

  let encounterId = "";
  const result = await runAction(
    "care.record",
    async (context) => {
      encounterId = await inTenant(context, (tx) =>
        recordEncounter(tx, context.tenant, { ...parsed.data, residentId }),
      );
      return { success: "ok" };
    },
    { values },
  );
  if (result?.success) {
    redirect(
      (back === "especialidad"
        ? `/especialidades/${parsed.data.specialtyId}?registrada=1`
        : `/atenciones/${encounterId}?registrada=1`) as Route,
    );
  }
  return result;
}

export async function voidEncounterAction(
  encounterId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (!id.safeParse(encounterId).success) return { error: "Atención inválida.", values };
  const parsed = voidEncounterSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  const result = await runAction(
    "care.record",
    async (context) => {
      await inTenant(context, (tx) => voidEncounter(tx, context.tenant, encounterId, parsed.data));
      return { success: "ok" };
    },
    { values },
  );
  if (result?.success) redirect(`/atenciones/${encounterId}?anulada=1` as Route);
  return result;
}
