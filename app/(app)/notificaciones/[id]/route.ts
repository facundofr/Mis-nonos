import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import * as schema from "@/db/schema";
import { markRead } from "@/features/notifications/service";
import { requireAppContext } from "@/lib/auth/session";
import { getDb, withTenant } from "@/lib/db";

/** Abrir un aviso: lo marca como leído y lleva a su pantalla (solo rutas internas). */
export async function GET(request: Request, { params }: RouteContext<"/notificaciones/[id]">) {
  const { id } = await params;
  const context = await requireAppContext();
  let target = "/notificaciones";
  if (z.uuid().safeParse(id).success) {
    const link = await withTenant(getDb(), context.tenant, async (tx) => {
      await markRead(tx, context.user.id, [id]);
      const [row] = await tx
        .select({ link: schema.notifications.link })
        .from(schema.notifications)
        .where(
          and(
            eq(schema.notifications.id, id),
            eq(schema.notifications.recipientUserId, context.user.id),
          ),
        );
      return row?.link ?? null;
    });
    // Solo rutas de la app: nunca otro dominio.
    if (link && link.startsWith("/") && !link.startsWith("//")) target = link;
  }
  return NextResponse.redirect(new URL(target, request.url));
}
