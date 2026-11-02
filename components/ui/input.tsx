import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

// 16 px de texto: los teléfonos no hacen zoom al enfocar el campo.
export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-12 w-full min-w-0 rounded-lg border border-input bg-card px-3.5 text-base text-foreground shadow-xs transition-[border-color,box-shadow]",
        "placeholder:text-muted-foreground",
        "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-sm font-medium", className)} {...props} />;
}

/** Texto de ayuda o de error debajo de un campo. */
export function FieldMessage({
  className,
  tone = "muted",
  ...props
}: ComponentProps<"p"> & { tone?: "muted" | "error" }) {
  return (
    <p
      className={cn(
        "text-[13px] leading-snug",
        tone === "error" ? "font-medium text-destructive" : "text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
