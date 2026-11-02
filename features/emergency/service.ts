import * as schema from "@/db/schema";
import { recordAudit } from "@/lib/audit";
import type { Transaction } from "@/lib/db/client";
import type { TenantContext } from "@/lib/db/tenant";
import { emitDomainEvent } from "@/lib/events";

/*
 * Cada apertura de la ficha de emergencia y cada hoja de derivación quedan
 * auditadas (7.3-E, F1-EMG-03). La apertura además avisa a Dirección
 * (DC-02): el evento lo procesa el worker, así la ficha no espera.
 */

export async function recordEmergencyView(
  tx: Transaction,
  actor: TenantContext,
  resident: { id: string; siteId: string },
): Promise<void> {
  await recordAudit(tx, actor, {
    action: "emergency.viewed",
    entityType: "resident",
    entityId: resident.id,
    siteId: resident.siteId,
  });
  await emitDomainEvent(tx, actor, {
    type: "emergency.viewed",
    entityType: "resident",
    entityId: resident.id,
    siteId: resident.siteId,
    payload: { viewerUserId: actor.userId },
  });
}

export async function recordSheetExport(
  tx: Transaction,
  actor: TenantContext,
  resident: { id: string; siteId: string },
): Promise<Date> {
  const [row] = await tx
    .insert(schema.emergencySheetExports)
    .values({
      organizationId: actor.organizationId,
      siteId: resident.siteId,
      residentId: resident.id,
      generatedBy: actor.userId,
    })
    .returning({ generatedAt: schema.emergencySheetExports.generatedAt });
  await recordAudit(tx, actor, {
    action: "emergency.pdf_generated",
    entityType: "resident",
    entityId: resident.id,
    siteId: resident.siteId,
  });
  return row!.generatedAt;
}
