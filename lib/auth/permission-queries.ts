import { eq } from "drizzle-orm";

import * as schema from "@/db/schema";
import type { Database } from "@/lib/db/client";
import { withTenant } from "@/lib/db/tenant";

import { effectivePermissions, type PermissionKey } from "./permissions";

/**
 * Permisos efectivos de una persona en una residencia: los de su rol (datos
 * en role_permissions) que pertenecen a módulos activos de la residencia.
 * Corre con RLS: solo ve los módulos de esa residencia.
 */
export async function queryPermissions(
  db: Database,
  input: { organizationId: string; userId: string; roleId: string },
): Promise<Set<PermissionKey>> {
  return withTenant(
    db,
    { organizationId: input.organizationId, userId: input.userId },
    async (tx) => {
      const granted = await tx
        .select({ key: schema.rolePermissions.permissionKey })
        .from(schema.rolePermissions)
        .where(eq(schema.rolePermissions.roleId, input.roleId));
      const modules = await tx
        .select({ key: schema.organizationModules.moduleKey })
        .from(schema.organizationModules)
        .where(eq(schema.organizationModules.enabled, true));
      return effectivePermissions(
        granted.map((row) => row.key),
        modules.map((row) => row.key),
      );
    },
  );
}
