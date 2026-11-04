"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getAdmission } from "@/features/residents/queries";
import { residentDataSchema } from "@/features/residents/schemas";
import {
  assertUniqueNationalId,
  cancelAdmission,
  completeAdmissionStep,
  confirmAdmission,
  startAdmission,
  updateResidentData,
} from "@/features/residents/service";
import { inTenant, runAction } from "@/lib/actions";
import { DomainError } from "@/lib/errors";
import { fieldErrorsFrom, formValues, type FormState } from "@/lib/forms";
import { getSiteContext } from "@/lib/site/server";

/*
 * Ingreso guiado en 4 pasos (7.3-C2, 6.12). Solo Administración y Dirección
 * (admissions.manage). Cada paso guarda: el ingreso se puede dejar a medias
 * y retomar desde "Ingresos en curso" (F.4).
 */

const id = z.uuid();
const STEP_PATHS = ["paciente", "responsable", "documentos", "confirmar"] as const;

function stepPath(admissionId: string, step: number): Route {
  return `/ingresos/${admissionId}/${STEP_PATHS[Math.min(Math.max(step, 1), 4) - 1]}` as Route;
}

/** Paso 1, la primera vez: crea el paciente en borrador. */
export async function startAdmissionAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = residentDataSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  let target: Route | null = null;
  const result = await runAction(
    "admissions.manage",
    async (context) => {
      const { site } = await getSiteContext(context);
      const { admissionId } = await inTenant(context, async (tx) => {
        await assertUniqueNationalId(tx, parsed.data.nationalId);
        return startAdmission(tx, context.tenant, site.id, parsed.data);
      });
      target = stepPath(admissionId, 2);
      return { success: "ok" };
    },
    { values },
  );
  if (target) redirect(target);
  return result;
}

/** Paso 1 de un ingreso ya empezado. */
export async function updateAdmissionPatientAction(
  admissionId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = residentDataSchema.safeParse(values);
  const version = Number(formData.get("version"));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  if (!id.safeParse(admissionId).success) return { error: "Ingreso inválido.", values };
  const result = await runAction(
    "admissions.manage",
    async (context) => {
      await inTenant(context, async (tx) => {
        const admission = await getAdmission(tx, admissionId);
        if (!admission || admission.status !== "draft") {
          throw new DomainError("Ese ingreso ya no está en curso.");
        }
        await assertUniqueNationalId(tx, parsed.data.nationalId, admission.residentId);
        await updateResidentData(tx, context.tenant, admission.residentId, version, parsed.data);
        await completeAdmissionStep(tx, admissionId, 1);
      });
      return { success: "ok" };
    },
    { values },
  );
  if (result?.success) redirect(stepPath(admissionId, 2));
  return result;
}

/** Marca un paso como hecho y pasa al siguiente. */
export async function completeStepAction(admissionId: string, step: 2 | 3): Promise<void> {
  if (!id.safeParse(admissionId).success) return;
  const result = await runAction("admissions.manage", async (context) => {
    await inTenant(context, (tx) => completeAdmissionStep(tx, admissionId, step));
    return { success: "ok" };
  });
  if (result?.success) redirect(stepPath(admissionId, step + 1));
}

/** Confirmar el ingreso (paso 4). */
export async function confirmAdmissionAction(
  admissionId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!id.safeParse(admissionId).success) return { error: "Ingreso inválido." };
  const values = formValues(formData);
  let residentId: string | null = null;
  const result = await runAction(
    "admissions.manage",
    async (context) => {
      residentId = await inTenant(context, (tx) =>
        confirmAdmission(tx, context.tenant, admissionId),
      );
      return { success: "ok" };
    },
    { values },
  );
  if (residentId) redirect(`/pacientes/${residentId}?ingreso=confirmado` as Route);
  return result;
}

export async function cancelAdmissionAction(
  admissionId: string,
  _previous: FormState,
): Promise<FormState> {
  if (!id.safeParse(admissionId).success) return { error: "Ingreso inválido." };
  const result = await runAction("admissions.manage", async (context) => {
    await inTenant(context, (tx) => cancelAdmission(tx, context.tenant, admissionId));
    return { success: "ok" };
  });
  if (result?.success) redirect("/ingresos?cancelado=1" as Route);
  return result;
}
