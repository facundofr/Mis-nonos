"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  SETUP_CATALOGS_KEY,
  SETUP_HIDDEN_KEY,
  TIPS,
  tipKey,
  WELCOME_KEY,
} from "@/features/onboarding/content";
import { markSeen, resetOnboarding } from "@/features/onboarding/service";
import { inTenant, runAction } from "@/lib/actions";

/*
 * Guía de uso (onboarding). Sin permiso especial: cada persona marca lo
 * suyo (RLS). Las claves válidas son solo las de la guía.
 */

const SETUP_KEYS = new Set([SETUP_CATALOGS_KEY, SETUP_HIDDEN_KEY]);

async function mark(key: string): Promise<void> {
  await runAction(null, async (context) => {
    await inTenant(context, (tx) => markSeen(tx, context.tenant, key));
    refresh();
    return null;
  });
}

export async function completeWelcomeAction(): Promise<void> {
  await mark(WELCOME_KEY);
}

export async function dismissTipAction(tip: string): Promise<void> {
  if (!Object.hasOwn(TIPS, tip)) return;
  await mark(tipKey(tip as keyof typeof TIPS));
}

export async function markSetupAction(key: string): Promise<void> {
  if (!SETUP_KEYS.has(key)) return;
  await mark(key);
}

export async function resetOnboardingAction(): Promise<void> {
  const result = await runAction(null, async (context) => {
    await inTenant(context, (tx) => resetOnboarding(tx, context.tenant));
    return { success: "ok" };
  });
  if (result?.success) {
    // La bienvenida la arma el marco de la app: se vuelve a armar.
    revalidatePath("/", "layout");
    redirect("/inicio");
  }
}
