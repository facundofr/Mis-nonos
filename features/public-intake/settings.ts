import { eq } from "drizzle-orm";

import * as schema from "@/db/schema";
import { diffChanges, recordAudit } from "@/lib/audit";
import type { Transaction } from "@/lib/db/client";
import type { TenantContext } from "@/lib/db/tenant";
import { DomainError } from "@/lib/errors";

import type { PublicIntakeSettingsInput } from "./schemas";

function isSlugTaken(error: unknown): boolean {
  for (let current = error; current; current = (current as { cause?: unknown }).cause) {
    const candidate = current as { code?: string; constraint?: string };
    if (candidate.code === "23505" && candidate.constraint === "sites_public_slug_unique") {
      return true;
    }
  }
  return false;
}

/**
 * Activa o apaga la landing de la sede y fija su dirección (12.9). Solo con
 * settings.manage (lo verifica la Server Action). Queda en la auditoría.
 * La dirección es única entre todas las residencias: como cada una ve solo
 * sus sedes, lo controla la restricción de la base.
 */
export async function updatePublicIntakeSettings(
  tx: Transaction,
  actor: TenantContext,
  siteId: string,
  input: PublicIntakeSettingsInput,
): Promise<void> {
  const [before] = await tx.select().from(schema.sites).where(eq(schema.sites.id, siteId));
  if (!before) throw new DomainError("La sede no existe.");
  try {
    await tx.update(schema.sites).set(input).where(eq(schema.sites.id, siteId));
  } catch (error) {
    if (isSlugTaken(error)) {
      throw new DomainError("Esa dirección ya la usa otra residencia. Elegí otra.", "publicSlug");
    }
    throw error;
  }
  const changes = diffChanges(before, { ...before, ...input }, Object.keys(input));
  if (changes) {
    await recordAudit(tx, actor, {
      action: "site.public_intake_updated",
      entityType: "site",
      entityId: siteId,
      siteId,
      changes,
    });
  }
}
