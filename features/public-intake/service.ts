import { sql } from "drizzle-orm";
import { z } from "zod";

import * as schema from "@/db/schema";
import { recordAudit } from "@/lib/audit";
import type { Database, Transaction } from "@/lib/db/client";
import { emitDomainEvent } from "@/lib/events";
import { uuidv7 } from "@/lib/ids";

import { PRIVACY_NOTICE_VERSION } from "./privacy";
import type { PublicRequestInput } from "./schemas";

/*
 * Formulario público de solicitud de ingreso (7.3-C3, 12.9, F1-SOL-03).
 * Todo pasa con el rol r360_public, que solo puede agregar la solicitud,
 * su evento y su auditoría: no lee ninguna tabla. La residencia sale de la
 * dirección de la landing (app.public_intake_site), nunca de lo que manda
 * el navegador. La respuesta no dice nada de lo que ya hay en la base
 * (por ejemplo, si el DNI existe).
 */

export interface PublicSite {
  organizationId: string;
  siteId: string;
  name: string;
  address: string | null;
  phone: string | null;
  intro: string | null;
}

const slugSchema = z
  .string()
  .max(60)
  .regex(/^[a-z0-9-]+$/i);

/**
 * Transacción con el rol del formulario público. `SET LOCAL` vale solo
 * dentro de la transacción: la conexión vuelve al pool con el rol de la app.
 */
export async function withPublicIntake<T>(
  db: Database,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local role r360_public`);
    return fn(tx);
  });
}

/** La residencia de una landing publicada, o null si no existe o está apagada. */
export async function findPublicSite(tx: Transaction, slug: string): Promise<PublicSite | null> {
  if (!slugSchema.safeParse(slug).success) return null;
  const result = await tx.execute<{
    organization_id: string;
    site_id: string;
    name: string;
    address: string | null;
    phone: string | null;
    intro: string | null;
  }>(sql`select * from app.public_intake_site(${slug})`);
  const row = result.rows[0];
  if (!row) return null;
  return {
    organizationId: row.organization_id,
    siteId: row.site_id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    intro: row.intro,
  };
}

/** Datos públicos de la landing (para mostrarla). */
export function getPublicSite(db: Database, slug: string): Promise<PublicSite | null> {
  return withPublicIntake(db, (tx) => findPublicSite(tx, slug));
}

export type PublicSubmitResult = "received" | "not_found";

/** ¿Es el aviso de que esa clave de envío ya se usó (doble envío)? */
function isDuplicateSubmission(error: unknown): boolean {
  for (let current = error; current; current = (current as { cause?: unknown }).cause) {
    const candidate = current as { code?: string; constraint?: string };
    if (
      candidate.code === "23505" &&
      candidate.constraint === "admission_requests_client_request_unique"
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Guarda una solicitud de la landing. Un doble envío (misma clave) no crea
 * otra: como no se puede leer, se reconoce por la restricción única y se
 * responde igual que la primera vez.
 */
export async function submitPublicRequest(
  db: Database,
  slug: string,
  input: PublicRequestInput,
  clientRequestId: string,
  now = new Date(),
): Promise<PublicSubmitResult> {
  const validClientRequestId = z.uuid().parse(clientRequestId);
  try {
    return await withPublicIntake(db, async (tx) => {
      const site = await findPublicSite(tx, slug);
      if (!site) return "not_found";
      await tx.execute(sql`select set_config('app.org_id', ${site.organizationId}, true)`);
      const id = uuidv7(now.getTime());
      await tx.insert(schema.admissionRequests).values({
        id,
        organizationId: site.organizationId,
        siteId: site.siteId,
        origin: "landing",
        status: "new",
        ...input,
        consentAcceptedAt: now,
        consentTextVersion: PRIVACY_NOTICE_VERSION,
        clientRequestId: validClientRequestId,
      });
      // Sin copiar los datos de la familia (DC-14).
      await recordAudit(
        tx,
        { organizationId: site.organizationId, userId: null },
        {
          action: "admission_request.created",
          entityType: "admission_request",
          entityId: id,
          siteId: site.siteId,
          metadata: { origin: "landing", consentTextVersion: PRIVACY_NOTICE_VERSION },
        },
      );
      // Aviso al personal y, si dejó email, el acuse a la familia (DC-16).
      await emitDomainEvent(
        tx,
        { organizationId: site.organizationId },
        {
          type: "admission_request.created",
          entityType: "admission_request",
          entityId: id,
          siteId: site.siteId,
          payload: { createdBy: null, origin: "landing" },
        },
      );
      return "received";
    });
  } catch (error) {
    if (isDuplicateSubmission(error)) return "received";
    throw error;
  }
}
