import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LogoMark } from "@/components/brand/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Sistema visual" };

// Muestra de los tokens claro y oscuro, solo en desarrollo.
const STATE_SAMPLES = [
  { label: "● Activo", className: "bg-success text-success-foreground" },
  { label: "◐ Seguimiento", className: "bg-warning text-warning-foreground" },
  {
    label: "⚠ Alergia: penicilina",
    className: "bg-danger-surface text-danger-surface-foreground font-semibold",
  },
  { label: "Internado fuera", className: "bg-info text-info-foreground" },
] as const;

export default function VisualSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 bg-surface px-5 py-12">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <LogoMark className="size-6" />
        </span>
        <div className="flex flex-col">
          <span className="text-xl font-semibold tracking-tight">{BRAND.appName}</span>
          <span className="text-sm text-muted-foreground">Sistema visual (solo desarrollo)</span>
        </div>
      </div>

      <section
        aria-labelledby="sistema-visual"
        className="flex flex-col gap-4 rounded-[14px] border bg-card p-5 text-card-foreground shadow-xs"
      >
        <div className="flex flex-col gap-1">
          <h1 id="sistema-visual" className="text-lg font-semibold">
            Sistema visual
          </h1>
          <p className="text-sm text-muted-foreground">Colores y estados en modo claro y oscuro.</p>
        </div>
        <ul className="flex flex-wrap gap-2">
          {STATE_SAMPLES.map((sample) => (
            <li
              key={sample.label}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sample.className}`}
            >
              {sample.label}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            Nuevo paciente
          </span>
          <span className="inline-flex h-10 items-center rounded-lg bg-destructive px-4 text-sm font-semibold text-destructive-foreground">
            Emergencia
          </span>
        </div>
      </section>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Apariencia
        </span>
        <ThemeToggle />
      </div>
    </main>
  );
}
