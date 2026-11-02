import { and, count, desc, eq, inArray, ne, notInArray } from "drizzle-orm";

import * as schema from "@/db/schema";
import type { AdmissionRequestStatus } from "@/db/schema/admission-requests";
import type { Transaction } from "@/lib/db/client";

import { findByNationalId } from "../residents/service";

/* Lecturas de solicitudes de ingreso (dentro de withTenant: solo la residencia activa). */

export type RequestRow = typeof schema.admissionRequests.$inferSelect;
export type RequestView = "abiertas" | "convertidas" | "descartadas";

const OPEN: AdmissionRequestStatus[] = ["new", "contacting", "waitlisted"];
const VIEW_STATUSES: Record<RequestView, AdmissionRequestStatus[]> = {
  abiertas: OPEN,
  convertidas: ["converted"],
  descartadas: ["discarded"],
};

export function listRequests(
  tx: Transaction,
  options: { siteId: string; view?: RequestView; limit?: number },
) {
  return tx
    .select({
      id: schema.admissionRequests.id,
      status: schema.admissionRequests.status,
      origin: schema.admissionRequests.origin,
      contactChannel: schema.admissionRequests.contactChannel,
      firstName: schema.admissionRequests.firstName,
      lastName: schema.admissionRequests.lastName,
      admissionModality: schema.admissionRequests.admissionModality,
      responsibleName: schema.admissionRequests.responsibleName,
      desiredAdmissionDate: schema.admissionRequests.desiredAdmissionDate,
      createdAt: schema.admissionRequests.createdAt,
      updatedAt: schema.admissionRequests.updatedAt,
    })
    .from(schema.admissionRequests)
    .where(
      and(
        eq(schema.admissionRequests.siteId, options.siteId),
        inArray(schema.admissionRequests.status, VIEW_STATUSES[options.view ?? "abiertas"]),
      ),
    )
    .orderBy(desc(schema.admissionRequests.createdAt), desc(schema.admissionRequests.id))
    .limit(options.limit ?? 100);
}

/** Cantidad por vista (pestañas) y nuevas sin revisar (Inicio). */
export async function countRequests(tx: Transaction, siteId: string) {
  const rows = await tx
    .select({ status: schema.admissionRequests.status, value: count() })
    .from(schema.admissionRequests)
    .where(eq(schema.admissionRequests.siteId, siteId))
    .groupBy(schema.admissionRequests.status);
  const by = (statuses: readonly string[]) =>
    rows.filter((row) => statuses.includes(row.status)).reduce((sum, row) => sum + row.value, 0);
  return {
    abiertas: by(OPEN),
    convertidas: by(["converted"]),
    descartadas: by(["discarded"]),
    nuevas: by(["new"]),
  };
}

export async function getRequest(tx: Transaction, requestId: string) {
  const [row] = await tx
    .select({ request: schema.admissionRequests, createdByName: schema.users.name })
    .from(schema.admissionRequests)
    .leftJoin(schema.users, eq(schema.users.id, schema.admissionRequests.createdBy))
    .where(eq(schema.admissionRequests.id, requestId));
  return row ?? null;
}

/**
 * Posibles duplicados (7.3-C3): pacientes con el mismo DNI y otras
 * solicitudes abiertas o convertidas con el mismo DNI. Solo se le
 * muestran al personal.
 */
export async function findRequestDuplicates(tx: Transaction, request: RequestRow) {
  if (!request.nationalId) return { residents: [], requests: [] };
  const residents = await findByNationalId(tx, request.nationalId);
  const requests = await tx
    .select({
      id: schema.admissionRequests.id,
      firstName: schema.admissionRequests.firstName,
      lastName: schema.admissionRequests.lastName,
      status: schema.admissionRequests.status,
    })
    .from(schema.admissionRequests)
    .where(
      and(
        eq(schema.admissionRequests.nationalId, request.nationalId),
        ne(schema.admissionRequests.id, request.id),
        notInArray(schema.admissionRequests.status, ["discarded"]),
      ),
    );
  return { residents, requests };
}
