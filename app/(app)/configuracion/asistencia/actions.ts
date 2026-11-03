"use server";

import { revalidatePath } from "next/cache";

import { rotateAttendanceToken } from "@/features/attendance/service";
import { inTenant, runAction } from "@/lib/actions";
import type { FormState } from "@/lib/forms";
import { getSiteContext } from "@/lib/site/server";

/** Código nuevo para el QR de asistencia: el impreso deja de funcionar. */
export async function rotateAttendanceTokenAction(_previous: FormState): Promise<FormState> {
  const result = await runAction("settings.manage", async (context) => {
    const { site } = await getSiteContext(context);
    await inTenant(context, (tx) => rotateAttendanceToken(tx, context.tenant, site.id));
    return { success: "Listo: el QR cambió. Imprimí el nuevo y reemplazá el de la entrada." };
  });
  if (result?.success) revalidatePath("/configuracion/asistencia");
  return result;
}
