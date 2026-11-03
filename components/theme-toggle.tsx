"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

// Más › Apariencia (canvas: MovilMas). "Sistema" sigue la configuración del teléfono.
// Sin elección, la app arranca en claro (app/layout.tsx).
const OPTIONS = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Sistema" },
] as const;

const noopSubscribe = () => () => {};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  // El tema elegido solo se conoce en el navegador: hasta entonces no se marca ninguno.
  const isClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const current = isClient ? (theme ?? "system") : undefined;

  return (
    <div
      role="group"
      aria-label="Apariencia"
      className={cn("grid grid-cols-3 gap-1 rounded-xl bg-muted p-1", className)}
    >
      {OPTIONS.map((option) => {
        const selected = current === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => setTheme(option.value)}
            className={cn(
              "h-10 rounded-[9px] px-3 text-sm font-medium text-muted-foreground transition-colors",
              "focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
              selected && "bg-card font-semibold text-foreground shadow-xs",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Botón del encabezado: pasa de claro a oscuro y vuelve. Los dos íconos se
 * dibujan y el CSS muestra uno, así el servidor y el navegador coinciden.
 */
export function ThemeSwitch({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Cambiar entre tema claro y oscuro"
      title="Tema claro u oscuro"
      className={cn(
        "flex size-10 items-center justify-center rounded-full text-foreground hover:bg-muted",
        "focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
        className,
      )}
    >
      <Moon aria-hidden="true" className="size-5 dark:hidden" />
      <Sun aria-hidden="true" className="hidden size-5 dark:block" />
    </button>
  );
}
