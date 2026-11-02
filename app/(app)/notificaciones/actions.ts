"use server";

import { refresh } from "next/cache";

import { markRead } from "@/features/notifications/service";
import { inTenant, runAction } from "@/lib/actions";

export async function markAllReadAction(): Promise<void> {
  await runAction(null, async (context) => {
    await inTenant(context, (tx) => markRead(tx, context.user.id));
    refresh();
    return null;
  });
}
