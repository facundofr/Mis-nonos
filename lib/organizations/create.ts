import { and, eq, isNull } from "drizzle-orm";

import * as schema from "@/db/schema";
import { createInvitation } from "@/lib/auth/invitations";
import { seedOrganizationDefaults } from "@/lib/catalogs/defaults";
import type { Transaction } from "@/lib/db/client";

export interface CreateOrganizationInput {
  /** Nombre de la residencia (organización). */
  organizationName: string;
  siteName: string;
  /** Primer administrador: recibe una invitación con el rol Administración. */
  adminEmail: string;
  adminName: string;
  now?: Date;
}

export interface CreatedOrganization {
  organizationId: string;
  siteId: string;
  invitationToken: string;
  invitationExpiresAt: Date;
}

/**
 * Alta de una residencia (DC-12): organización, primera sede, catálogos
 * iniciales, módulos del MVP e invitación para su primer administrador.
 * Corre con el rol dueño, que no pasa por RLS: solo la usan el script de
 * alta y las pruebas. Queda registrada en la auditoría.
 */
export async function createOrganization(
  tx: Transaction,
  input: CreateOrganizationInput,
): Promise<CreatedOrganization> {
  const now = input.now ?? new Date();

  const [organization] = await tx
    .insert(schema.organizations)
    .values({ name: input.organizationName.trim() })
    .returning({ id: schema.organizations.id });
  if (!organization) throw new Error("No se pudo crear la organización.");

  const [site] = await tx
    .insert(schema.sites)
    .values({ organizationId: organization.id, name: input.siteName.trim() })
    .returning({ id: schema.sites.id });
  if (!site) throw new Error("No se pudo crear la sede.");

  // Turnos, categorías de novedades y documentos del legajo iniciales.
  await seedOrganizationDefaults(tx, { organizationId: organization.id, siteId: site.id });

  // Módulos: el núcleo, el abono mensual (DT-05) y el seguimiento del cuidado (0017).
  await tx.insert(schema.organizationModules).values(
    (["core", "fees", "care"] as const).map((moduleKey) => ({
      organizationId: organization.id,
      moduleKey,
      enabled: true,
      enabledAt: now,
    })),
  );

  const [adminRole] = await tx
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .where(and(eq(schema.roles.key, "admin"), isNull(schema.roles.organizationId)));
  if (!adminRole) {
    throw new Error('Falta el rol de sistema "admin": aplicá las migraciones (db:migrate).');
  }

  await tx.insert(schema.auditEvents).values({
    organizationId: organization.id,
    siteId: site.id,
    actorUserId: null,
    action: "organization.created",
    entityType: "organization",
    entityId: organization.id,
    metadata: { via: "script" },
  });

  const invitation = await createInvitation(tx, {
    organizationId: organization.id,
    siteId: null,
    email: input.adminEmail,
    name: input.adminName,
    roleId: adminRole.id,
    invitedBy: null,
    now,
  });

  return {
    organizationId: organization.id,
    siteId: site.id,
    invitationToken: invitation.token,
    invitationExpiresAt: invitation.expiresAt,
  };
}
