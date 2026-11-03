"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { isFreshScan, TOKEN_PATTERN, type AttendanceKind } from "@/features/attendance/rules";
import { INVALID_TOKEN_MESSAGE, recordAttendance } from "@/features/attendance/service";
import { inTenant, runAction } from "@/lib/actions";
import type { FormState } from "@/lib/forms";
import { getSiteContext } from "@/lib/site/server";

/** Registrar la entrada o la salida desde el QR (docs/decisions/0020). */
export async function recordAttendanceAction(
  token: string,
  openedAt: number,
  _previous: FormState,
): Promise<FormState> {
  if (!TOKEN_PATTERN.test(token)) return { error: INVALID_TOKEN_MESSAGE };
  // Para cada registro hay que escanear el QR: la pantalla vale 5 minutos.
  if (!isFreshScan(openedAt, new Date())) {
    return { error: "Pasó mucho tiempo desde que escaneaste: volvé a escanear el QR." };
  }
  let kind: AttendanceKind = "in";
  const result = await runAction("attendance.record", async (context) => {
    const { site } = await getSiteContext(context);
    const record = await inTenant(context, (tx) =>
      recordAttendance(tx, context.tenant, { siteId: site.id, token }),
    );
    kind = record.kind;
    return { success: "ok" };
  });
  if (result?.success) {
    redirect(`/fichar/${token}?listo=${kind === "in" ? "entrada" : "salida"}` as Route);
  }
  return result;
}
