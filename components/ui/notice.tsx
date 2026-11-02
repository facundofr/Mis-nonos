import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const TONES = {
  info: { className: "bg-info text-info-foreground", Icon: Info },
  success: { className: "bg-success text-success-foreground", Icon: CircleCheck },
  warning: { className: "bg-warning text-warning-foreground", Icon: TriangleAlert },
  error: {
    className: "border border-danger-border bg-danger-surface text-danger-surface-foreground",
    Icon: CircleAlert,
  },
} as const;

export type NoticeTone = keyof typeof TONES;

/** Aviso con ícono y texto: el estado nunca depende solo del color. */
export function Notice({
  tone = "info",
  children,
  className,
}: {
  tone?: NoticeTone;
  children: ReactNode;
  className?: string;
}) {
  const { className: toneClassName, Icon } = TONES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm leading-snug",
        toneClassName,
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-px size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
