import { z } from "zod";

import { loadEmergencySheet } from "@/features/emergency/queries";
import { renderReferralSheet } from "@/features/emergency/referral-pdf";
import { recordSheetExport } from "@/features/emergency/service";
import { can } from "@/lib/auth/authorization";
import { requireAppContext } from "@/lib/auth/session";
import { getDb, withTenant } from "@/lib/db";
import { getSiteContext } from "@/lib/site/server";
import { formatDateTime } from "@/lib/time/format";

/**
 * Hoja de derivación en PDF (F1-EMG-02). Cualquier persona del personal
 * activo (emergency.pdf); cada hoja generada queda registrada (F1-EMG-03).
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/emergencia/[id]/hoja">,
) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response("No encontrado", { status: 404 });

  const context = await requireAppContext();
  if (!(await can(context, "emergency.pdf"))) return new Response("Sin permiso", { status: 403 });
  const { site, today } = await getSiteContext(context);

  const result = await withTenant(getDb(), context.tenant, async (tx) => {
    const sheet = await loadEmergencySheet(tx, id);
    if (!sheet) return null;
    const generatedAt = await recordSheetExport(tx, context.tenant, sheet.resident);
    return { sheet, generatedAt };
  });
  if (!result) return new Response("No encontrado", { status: 404 });

  const pdf = await renderReferralSheet({
    sheet: result.sheet,
    today,
    generatedAt: formatDateTime(result.generatedAt, site.timezone),
    generatedBy: context.user.name,
  });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="hoja-de-derivacion.pdf"',
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
