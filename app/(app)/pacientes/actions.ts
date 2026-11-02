"use server";

import type { Route } from "next";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getAdmissionByResident } from "@/features/residents/queries";
import {
  allergySchema,
  contactSchema,
  dischargeSchema,
  hospitalizeSchema,
  residentDataSchema,
  returnSchema,
} from "@/features/residents/schemas";
import {
  addAllergy,
  discardAllergy,
  dischargeResident,
  assertUniqueNationalId,
  hospitalize,
  removeContact,
  returnFromHospital,
  saveContact,
  updateResidentData,
} from "@/features/residents/service";
import { inTenant, runAction } from "@/lib/actions";
import { fieldErrorsFrom, formValues, type FormState } from "@/lib/forms";
import { getSiteContext } from "@/lib/site/server";

const id = z.uuid();

/** Adónde vuelve un formulario de contacto: la ficha o el paso 2 del ingreso. */
export type ContactReturn = "ficha" | "ingreso";

async function contactReturnPath(
  residentId: string,
  back: ContactReturn,
  admissionId: string | null,
): Promise<Route> {
  if (back === "ingreso" && admissionId) return `/ingresos/${admissionId}/responsable` as Route;
  return `/pacientes/${residentId}?tab=contactos` as Route;
}

export async function updateResidentAction(
  residentId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = residentDataSchema.safeParse(values);
  const version = Number(formData.get("version"));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  if (!id.safeParse(residentId).success || !Number.isInteger(version)) {
    return { error: "Paciente inválido.", values };
  }
  const result = await runAction(
    "residents.update",
    async (context) => {
      await inTenant(context, async (tx) => {
        await assertUniqueNationalId(tx, parsed.data.nationalId, residentId);
        await updateResidentData(tx, context.tenant, residentId, version, parsed.data);
      });
      return { success: "ok" };
    },
    { values },
  );
  if (result?.success) redirect(`/pacientes/${residentId}?guardado=1` as Route);
  return result;
}

export async function saveContactAction(
  residentId: string,
  contactId: string | null,
  back: ContactReturn,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  if (!id.safeParse(residentId).success || (contactId && !id.safeParse(contactId).success)) {
    return { error: "Contacto inválido.", values };
  }
  let target: Route | null = null;
  const result = await runAction(
    "contacts.manage",
    async (context) => {
      const { today } = await getSiteContext(context);
      const admissionId = await inTenant(context, async (tx) => {
        await saveContact(tx, context.tenant, residentId, contactId, parsed.data, today);
        return (await getAdmissionByResident(tx, residentId))?.id ?? null;
      });
      target = await contactReturnPath(residentId, back, admissionId);
      return { success: "ok" };
    },
    { values },
  );
  if (result?.success && target) redirect(target);
  return result;
}

export async function removeContactAction(
  residentId: string,
  contactId: string,
  back: ContactReturn,
): Promise<void> {
  if (!id.safeParse(residentId).success || !id.safeParse(contactId).success) return;
  let target: Route | null = null;
  const result = await runAction("contacts.manage", async (context) => {
    const admissionId = await inTenant(context, async (tx) => {
      await removeContact(tx, context.tenant, residentId, contactId);
      return (await getAdmissionByResident(tx, residentId))?.id ?? null;
    });
    target = await contactReturnPath(residentId, back, admissionId);
    return { success: "ok" };
  });
  if (result?.success && target) redirect(target);
}

export async function addAllergyAction(
  residentId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = allergySchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  if (!id.safeParse(residentId).success) return { error: "Paciente inválido." };
  return runAction(
    "residents.update",
    async (context) => {
      await inTenant(context, (tx) => addAllergy(tx, context.tenant, residentId, parsed.data));
      refresh();
      return { success: `Alergia a ${parsed.data.substance} agregada.` };
    },
    { values },
  );
}

export async function discardAllergyAction(residentId: string, allergyId: string): Promise<void> {
  if (!id.safeParse(residentId).success || !id.safeParse(allergyId).success) return;
  await runAction("residents.update", async (context) => {
    await inTenant(context, (tx) => discardAllergy(tx, context.tenant, residentId, allergyId));
    refresh();
    return null;
  });
}

export async function hospitalizeAction(
  residentId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = hospitalizeSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  const result = await runAction(
    "residents.status",
    async (context) => {
      await inTenant(context, (tx) => hospitalize(tx, context.tenant, residentId, parsed.data));
      return { success: "ok" };
    },
    { values },
  );
  if (result?.success) redirect(`/pacientes/${residentId}` as Route);
  return result;
}

export async function returnFromHospitalAction(
  residentId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = returnSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  const result = await runAction(
    "residents.status",
    async (context) => {
      await inTenant(context, (tx) =>
        returnFromHospital(tx, context.tenant, residentId, parsed.data),
      );
      return { success: "ok" };
    },
    { values },
  );
  if (result?.success) redirect(`/pacientes/${residentId}` as Route);
  return result;
}

export async function dischargeAction(
  residentId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsed = dischargeSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  const result = await runAction(
    "residents.discharge",
    async (context) => {
      await inTenant(context, (tx) =>
        dischargeResident(tx, context.tenant, residentId, parsed.data),
      );
      return { success: "ok" };
    },
    { values },
  );
  if (result?.success) redirect(`/pacientes/${residentId}` as Route);
  return result;
}
