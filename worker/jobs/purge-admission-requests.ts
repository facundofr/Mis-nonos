import { sql } from "drizzle-orm";

import type { recordAudit as RecordAudit } from "@/lib/audit";
import type { Database } from "@/lib/db/client";
import { withSystemTenant } from "@/lib/db/tenant";

/** Plazo de conservación de las solicitudes no convertidas (DC-14, a revisar con el abogado). */
export const ADMISSION_REQUEST_RETENTION_MONTHS = 12;

/**
 * Borra las solicitudes de ingreso que no se convirtieron y no tuvieron
 * actividad en 12 meses (DC-14). El borrado lo hace una función de la base
 * que solo puede ejecutar el rol del worker: la app no tiene DELETE. Queda
 * en la auditoría de cada residencia cuántas se borraron (sin datos).
 */
export async function purgeStaleAdmissionRequests(
  workerDb: Database,
  appDb: Database,
  recordAudit: typeof RecordAudit,
): Promise<number> {
  const result = await workerDb.execute<{ organization_id: string; deleted: number }>(
    sql`select organization_id, deleted from app.purge_stale_admission_requests(${ADMISSION_REQUEST_RETENTION_MONTHS})`,
  );
  let total = 0;
  for (const row of result.rows) {
    total += row.deleted;
    await withSystemTenant(appDb, row.organization_id, (tx) =>
      recordAudit(
        tx,
        { organizationId: row.organization_id, userId: null },
        {
          action: "admission_request.purged",
          entityType: "admission_request",
          metadata: { count: row.deleted, months: ADMISSION_REQUEST_RETENTION_MONTHS },
        },
      ),
    );
  }
  return total;
}
