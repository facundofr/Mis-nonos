import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

import { FieldMessage, Label } from "./input";

/**
 * Campo de formulario: etiqueta, control, ayuda y error. El control recibe
 * `id` y los atributos de accesibilidad desde `children` como función.
 */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: (control: {
    id: string;
    "aria-invalid"?: true;
    "aria-describedby"?: string;
    required?: boolean;
  }) => ReactNode;
}) {
  const hintId = hint ? `${id}-ayuda` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-muted-foreground"> *</span> : null}
      </Label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        required,
      })}
      {error ? (
        <FieldMessage id={errorId} tone="error">
          {error}
        </FieldMessage>
      ) : null}
      {hint ? <FieldMessage id={hintId}>{hint}</FieldMessage> : null}
    </div>
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full min-w-0 rounded-lg border border-input bg-card px-3.5 py-3 text-base leading-relaxed text-foreground shadow-xs transition-[border-color,box-shadow]",
        "placeholder:text-muted-foreground",
        "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Lista de opciones. Con `defaultValue`, la clave hace que se vuelva a armar
 * cuando cambia: React solo aplica `defaultValue` de un select al montarlo,
 * y después de cada Server Action vacía el formulario, así que sin esto la
 * opción elegida se perdía al volver con un error.
 */
export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      key={props.defaultValue === undefined ? undefined : String(props.defaultValue)}
      className={cn(
        "h-12 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-base text-foreground shadow-xs",
        "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25",
        "aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

/** Casilla con texto y explicación, con un área táctil amplia. */
export function CheckboxField({
  name,
  label,
  description,
  defaultChecked,
  value = "on",
}: {
  name: string;
  label: ReactNode;
  description?: ReactNode;
  defaultChecked?: boolean;
  value?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card px-3.5 py-3">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-[18px] shrink-0 accent-primary-ink"
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-medium">{label}</span>
        {description ? (
          <span className="text-[13px] leading-snug text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
