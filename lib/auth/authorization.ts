import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { getDb } from "@/lib/db";

import { queryPermissions } from "./permission-queries";
import type { PermissionKey } from "./permissions";
import { requireAppContext, type AppContext } from "./session";

/*
 * Permisos como datos con can() en el servidor (E4). La interfaz puede
 * esconder botones, pero la autorización real está acá: cada pantalla y
 * cada Server Action la vuelve a verificar.
 */

export const NO_PERMISSION_MESSAGE =
  "No tenés permiso para hacer esto. Si lo necesitás, pedíselo a la administración.";

// Se memoriza durante el pedido; las claves son textos para que React las compare.
const loadPermissions = cache(
  (organizationId: string, userId: string, roleId: string): Promise<Set<PermissionKey>> =>
    queryPermissions(getDb(), { organizationId, userId, roleId }),
);

/** Permisos efectivos en la residencia activa (rol más módulos activos). */
export function getPermissions(context: AppContext): Promise<ReadonlySet<PermissionKey>> {
  return loadPermissions(
    context.tenant.organizationId,
    context.tenant.userId,
    context.membership.roleId,
  );
}

export async function can(context: AppContext, permission: PermissionKey): Promise<boolean> {
  return (await getPermissions(context)).has(permission);
}

/** Para pantallas: exige el permiso; si falta, lleva a "Sin permiso". */
export async function requirePermission(permission: PermissionKey): Promise<AppContext> {
  const context = await requireAppContext();
  if (!(await can(context, permission))) redirect("/sin-permiso");
  return context;
}
