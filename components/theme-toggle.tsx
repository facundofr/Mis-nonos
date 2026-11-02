"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

// Más › Apariencia (canvas: MovilMas). "Sistema" sigue la configuración del teléfono.
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
