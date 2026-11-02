"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { confirmHandover, deliverHandover, deliverSchema } from "@/features/handover/service";
import { inTenant, runAction } from "@/lib/actions";
import { fieldErrorsFrom, formValues, type FormState } from "@/lib/forms";
import { getSiteContext } from "@/lib/site/server";

const target = z.object({
  shiftId: z.uuid(),
  shiftDate: z.iso.date(),
});

export async function deliverHandoverAction(
  shiftId: string,
  shiftDate: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  const parsedTarget = target.safeParse({ shiftId, shiftDate });
  const expectedVersion = Number(formData.get("version"));
  if (!parsedTarget.success || !Number.isInteger(expectedVersion) || expectedVersion < 0) {
    return { error: "Turno inválido.", values };
  }
  const parsed = deliverSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  return runAction(
    "handover.deliver",
    async (context) => {
      const { site } = await getSiteContext(context);
      await inTenant(context, (tx) =>
        deliverHandover(tx, context.tenant, {
          ...parsed.data,
          ...parsedTarget.data,
          siteId: site.id,
          expectedVersion,
        }),
      );
      refresh();
      return { success: "Turno entregado." };
    },
    { values },
  );
}

export async function confirmHandoverAction(
  shiftId: string,
  shiftDate: string,
  _previous: FormState,
  _formData: FormData,
): Promise<FormState> {
  const parsedTarget = target.safeParse({ shiftId, shiftDate });
  if (!parsedTarget.success) return { error: "Turno inválido." };
  return runAction("handover.confirm", async (context) => {
    const { site } = await getSiteContext(context);
    await inTenant(context, (tx) =>
      confirmHandover(tx, context.tenant, { ...parsedTarget.data, siteId: site.id }),
    );
    refresh();
    return { success: "Recepción confirmada." };
  });
}
