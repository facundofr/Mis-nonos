import { Lightbulb } from "lucide-react";

import { TIPS, tipKey, type TipKey } from "@/features/onboarding/content";
import { getSeenOnboarding } from "@/features/onboarding/server";
import type { AppContext } from "@/lib/auth/session";

import { dismissTipAction } from "./actions";

/**
 * Consejo de la primera vez en una pantalla (onboarding). Desaparece con
 * "Entendido" y no vuelve, salvo "Volver a ver la guía".
 */
export async function PageTip({ context, tip }: { context: AppContext; tip: TipKey }) {
  const seen = await getSeenOnboarding(context);
  if (seen.has(tipKey(tip))) return null;
  const { title, body } = TIPS[tip];
  return (
    <aside
      aria-label="Consejo"
      className="flex items-start gap-3 rounded-[14px] border border-primary/25 bg-secondary px-4 py-3.5 text-secondary-foreground"
    >
      <Lightbulb aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-[15px] font-semibold">{title}</p>
        <p className="text-sm leading-relaxed">{body}</p>
      </div>
      <form action={dismissTipAction.bind(null, tip)}>
        <button
          type="submit"
          className="h-9 shrink-0 rounded-lg px-2.5 text-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
        >
          Entendido
        </button>
      </form>
    </aside>
  );
}
