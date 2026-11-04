"use client";

import {
  ArrowRightLeft,
  ClipboardPlus,
  History,
  House,
  LockKeyhole,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { WelcomeIcon, WelcomeStep } from "@/features/onboarding/content";
import { cn } from "@/lib/utils";

import { completeWelcomeAction } from "./actions";

const ICONS: Record<WelcomeIcon, LucideIcon> = {
  home: House,
  residents: Users,
  handover: ArrowRightLeft,
  admission: ClipboardPlus,
  activity: History,
  settings: Settings,
  privacy: LockKeyhole,
};

/**
 * Bienvenida de la primera vez (onboarding): unos pasos según lo que puede
 * hacer cada rol. Se puede saltar; al terminar no vuelve a aparecer (salvo
 * "Volver a ver la guía" en Más). Usa <dialog> para el foco y la tecla Esc.
 */
export function WelcomeTour({
  steps,
  organizationName,
  firstName,
}: {
  steps: Omit<WelcomeStep, "anyOf">[];
  organizationName: string;
  firstName: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);

  const finish = () => {
    startTransition(async () => {
      await completeWelcomeAction();
      dialog.current?.close();
    });
  };

  const step = steps[index]!;
  const Icon = ICONS[step.icon];
  const last = index === steps.length - 1;
  const title = index === 0 ? `${step.title}, ${firstName}` : step.title;

  return (
    <dialog
      ref={dialog}
      aria-labelledby="guia-titulo"
      aria-describedby="guia-texto"
      onCancel={(event) => {
        // Esc = saltar la guía.
        event.preventDefault();
        finish();
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-md rounded-[20px] border bg-card p-0 text-card-foreground shadow-xl",
        "backdrop:bg-black/50 backdrop:backdrop-blur-[2px]",
      )}
    >
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {organizationName}
          </span>
          <span className="text-xs text-muted-foreground" aria-live="polite">
            Paso {index + 1} de {steps.length}
          </span>
        </div>

        <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
          <Icon aria-hidden="true" className="size-7" />
        </span>

        <div className="flex flex-col gap-2">
          <h2 id="guia-titulo" className="text-xl font-semibold tracking-tight">
            {title}
          </h2>
          <p id="guia-texto" className="text-[15px] leading-relaxed text-muted-foreground">
            {step.body}
          </p>
        </div>

        <div className="flex justify-center gap-1.5" aria-hidden="true">
          {steps.map((item, position) => (
            <span
              key={item.key}
              className={cn(
                "h-1.5 rounded-full bg-muted transition-all",
                position === index ? "w-6 bg-primary" : "w-1.5",
              )}
            />
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            disabled={pending}
            onClick={() => (last ? finish() : setIndex(index + 1))}
            autoFocus
          >
            {last ? (pending ? "Guardando…" : "Empezar") : "Siguiente"}
          </Button>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="md"
              disabled={index === 0 || pending}
              onClick={() => setIndex(index - 1)}
            >
              Anterior
            </Button>
            {!last ? (
              <Button variant="ghost" size="md" disabled={pending} onClick={finish}>
                Saltar la guía
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </dialog>
  );
}
