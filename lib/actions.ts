import "server-only";

import { unstable_rethrow } from "next/navigation";

import { can, NO_PERMISSION_MESSAGE } from "@/lib/auth/authorization";
import { limiters, tooManyAttemptsMessage } from "@/lib/auth/limiters";
import type { PermissionKey } from "@/lib/auth/permissions";
import { requireAppContext, requireAppContextWithGates, type AppContext } from "@/lib/auth/session";
import { getDb, withTenant, type Transaction } from "@/lib/db";
import { DomainError } from "@/lib/errors";
import type { FormState } from "@/lib/forms";
import { logger } from "@/lib/logger/server";

/*
 * Envoltorio de las Server Actions de la app. En cada una:
 * 1. vuelve a exigir sesión y residencia (requireAppContext);
 * 2. verifica el permiso con can() (la interfaz puede esconder botones,
 *    pero la autorización real es esta);
 * 3. aplica el tope de escrituras por persona (10.14);
 * 4. traduce los errores: los de negocio se muestran tal cual; los demás
 *    se registran (sin datos personales) y se muestra un mensaje genérico.
 */

export const UNEXPECTED_ERROR_MESSAGE =
  "No se pudo guardar. Puede ser un problema momentáneo: probá de nuevo en unos segundos.";

export async function runAction<T = undefined>(
  permission: PermissionKey | null,
  action: (context: AppContext) => Promise<FormState<T>>,
  options: {
    values?: Record<string, string>;
    /** Solo para el cambio obligatorio de contraseña, que se hace antes de entrar. */
    allowPendingGates?: boolean;
  } = {},
): Promise<FormState<T>> {
  const context = options.allowPendingGates
    ? await requireAppContextWithGates()
    : await requireAppContext();
  if (permission && !(await can(context, permission))) {
    return { error: NO_PERMISSION_MESSAGE, values: options.values };
  }

  const rate = limiters.writesByUser.check(context.user.id);
  if (!rate.allowed) {
    return { error: tooManyAttemptsMessage(rate.retryAfterSeconds), values: options.values };
  }
  limiters.writesByUser.recordFailure(context.user.id);

  try {
    return await action(context);
  } catch (error) {
    // redirect() y notFound() se propagan: son la forma normal de terminar.
    unstable_rethrow(error);
    if (error instanceof DomainError) {
      return {
        error: error.field ? undefined : error.message,
        fieldErrors: error.field ? { [error.field]: error.message } : undefined,
        values: options.values,
      };
    }
    logger.error({ err: error, permission }, "Falló una acción");
    return { error: UNEXPECTED_ERROR_MESSAGE, values: options.values };
  }
}

/** Transacción con el contexto de la residencia activa (RLS). */
export function inTenant<T>(context: AppContext, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return withTenant(getDb(), context.tenant, fn);
}
