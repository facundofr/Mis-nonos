import { CircleCheck, Circle } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { SETUP_CATALOGS_KEY, SETUP_HIDDEN_KEY } from "@/features/onboarding/content";
import type { SetupProgress } from "@/features/onboarding/service";
import { cn } from "@/lib/utils";

import { markSetupAction } from "./actions";

/**
 * "Puesta en marcha" (onboarding de Administración): se completa sola con
 * los datos reales. Desaparece cuando está todo o con "Ocultar".
 */
export function SetupChecklist({ progress }: { progress: SetupProgress }) {
  const items: { done: boolean; title: string; detail: string; href: Route; manual?: boolean }[] = [
    {
      done: progress.siteDetails,
      title: "Datos de la residencia",
      detail: "Dirección y teléfono: salen en la hoja de derivación.",
      href: "/configuracion/residencia",
    },
    {
      done: progress.emergencyService,
      title: "Servicio de emergencias",
      detail: "Nombre, teléfono y N.º de cliente: es lo primero en cada ficha de emergencia.",
      href: "/configuracion/residencia",
    },
    {
      done: progress.catalogsReviewed,
      title: "Turnos, categorías y documentos",
      detail: "Vienen cargados con valores habituales: revisá que coincidan con la residencia.",
      href: "/configuracion",
      manual: true,
    },
    {
      done: progress.staffAdded,
      title: "Sumá al personal",
      detail: "Invitá por email o creá usuarios para quien no tiene.",
      href: "/usuarios/invitar",
    },
    {
      done: progress.firstAdmission,
      title: "Primer ingreso",
      detail: "Cargá un paciente con el ingreso guiado.",
      href: "/ingresos/nuevo",
    },
  ];
  const done = items.filter((item) => item.done).length;
  if (done === items.length) return null;

  return (
    <section
      aria-labelledby="puesta-en-marcha"
      className="flex flex-col gap-4 rounded-[14px] border bg-card p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="puesta-en-marcha" className="text-lg font-semibold">
            Puesta en marcha · {done} de {items.length}
          </h2>
          <p className="text-sm text-muted-foreground">
            Lo necesario para que el personal empiece a usar la app.
          </p>
        </div>
        <form action={markSetupAction.bind(null, SETUP_HIDDEN_KEY)}>
          <button
            type="submit"
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            Ocultar
          </button>
        </form>
      </div>
      <div
        className="flex gap-1"
        role="progressbar"
        aria-label="Avance de la puesta en marcha"
        aria-valuemin={0}
        aria-valuemax={items.length}
        aria-valuenow={done}
      >
        {/* Segmentos con clases: la CSP de producción no permite estilos en línea. */}
        {items.map((item, position) => (
          <span
            key={item.title}
            className={cn("h-2 flex-1 rounded-full", position < done ? "bg-primary" : "bg-muted")}
          />
        ))}
      </div>
      <ol className="flex flex-col divide-y">
        {items.map((item) => {
          const Icon = item.done ? CircleCheck : Circle;
          return (
            <li key={item.title} className="flex items-start gap-3 py-3">
              <Icon
                aria-hidden="true"
                className={cn(
                  "mt-0.5 size-5 shrink-0",
                  item.done ? "text-success-foreground" : "text-muted-foreground",
                )}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  className={cn("font-medium", item.done && "text-muted-foreground line-through")}
                >
                  {item.title}
                  <span className="sr-only">{item.done ? " (listo)" : " (pendiente)"}</span>
                </span>
                {!item.done ? (
                  <span className="text-sm text-muted-foreground">{item.detail}</span>
                ) : null}
              </div>
              {!item.done ? (
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Link
                    href={item.href}
                    className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    {item.manual ? "Revisar" : "Hacerlo"}
                  </Link>
                  {item.manual ? (
                    <form action={markSetupAction.bind(null, SETUP_CATALOGS_KEY)}>
                      <button
                        type="submit"
                        className="text-[13px] text-muted-foreground underline-offset-4 hover:underline"
                      >
                        Ya los revisé
                      </button>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
