"use server";

import type { Route } from "next";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  discardSchema,
  requestSchema,
  statusChangeSchema,
} from "@/features/admission-requests/schemas";
import {
  changeRequestStatus,
  convertRequest,
  createRequest,
  discardRequest,
  updateRequest,
} from "@/features/admission-requests/service";
import { inTenant, runAction } from "@/lib/actions";
import { can, NO_PERMISSION_MESSAGE } from "@/lib/auth/authorization";
import { fieldErrorsFrom, formValues, type FormState } from "@/lib/forms";
import { getSiteContext } from "@/lib/site/server";

const id = z.uuid();
const PERMISSION = "admission_requests.manage";

export async function createRequestAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const clientRequestId = id.safeParse(formData.get("clientRequestId"));
  if (!clientRequestId.success) return { error: "Volvé a abrir el formulario.", values };
  const parsed = requestSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  let requestId: string | null = null;
  const result = await runAction(
    PERMISSION,
    async (context) => {
      const { site } = await getSiteContext(context);
      requestId = await inTenant(context, (tx) =>
        createRequest(tx, context.tenant, site.id, parsed.data, clientRequestId.data),
      );
      return { success: "ok" };
    },
    { values },
  );
  if (result?.success && requestId) redirect(`/solicitudes/${requestId}?creada=1` as Route);
  return result;
}

export async function updateRequestAction(
  requestId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const version = Number(formData.get("version"));
  if (!id.safeParse(requestId).success || !Number.isInteger(version)) {
    return { error: "Solicitud inválida.", values };
  }
  const parsed = requestSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  const result = await runAction(
    PERMISSION,
    async (context) => {
      await inTenant(context, (tx) =>
        updateRequest(tx, context.tenant, requestId, version, parsed.data),
      );
      return { success: "ok" };
    },
    { values },
  );
  if (result?.success) redirect(`/solicitudes/${requestId}?guardada=1` as Route);
  return result;
}

export async function changeRequestStatusAction(
  requestId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = statusChangeSchema.safeParse({ status: formData.get("status") });
  if (!id.safeParse(requestId).success || !parsed.success) return { error: "Estado inválido." };
  return runAction(PERMISSION, async (context) => {
    await inTenant(context, (tx) =>
      changeRequestStatus(tx, context.tenant, requestId, parsed.data.status),
    );
    refresh();
    return { success: "Estado actualizado." };
  });
}

export async function discardRequestAction(
  requestId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (!id.safeParse(requestId).success) return { error: "Solicitud inválida.", values };
  const parsed = discardSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  return runAction(
    PERMISSION,
    async (context) => {
      await inTenant(context, (tx) => discardRequest(tx, context.tenant, requestId, parsed.data));
      refresh();
      return { success: "Solicitud descartada." };
    },
    { values },
  );
}

/** Convertir en ingreso (F1-SOL-02): necesita también poder hacer ingresos. */
export async function convertRequestAction(
  requestId: string,
  _previous: FormState,
  _formData: FormData,
): Promise<FormState> {
  if (!id.safeParse(requestId).success) return { error: "Solicitud inválida." };
  let admissionId: string | null = null;
  const result = await runAction("admissions.manage", async (context) => {
    if (!(await can(context, PERMISSION))) return { error: NO_PERMISSION_MESSAGE };
    const { today } = await getSiteContext(context);
    ({ admissionId } = await inTenant(context, (tx) =>
      convertRequest(tx, context.tenant, requestId, today),
    ));
    return { success: "ok" };
  });
  if (result?.success && admissionId) {
    redirect(`/ingresos/${admissionId}/responsable?desde=solicitud` as Route);
  }
  return result;
}
