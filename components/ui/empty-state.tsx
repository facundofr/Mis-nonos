import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Estado vacío (diseño EstadosUI): ícono, título, explicación y, si hay, una acción. */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="mb-1 flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <p className="text-base font-semibold">{title}</p>
      {children ? (
        <div className="max-w-sm text-sm leading-relaxed text-muted-foreground">{children}</div>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
