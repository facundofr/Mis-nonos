import { Check } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getAdmission, getResident, listContacts } from "@/features/residents/queries";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";
import { cn } from "@/lib/utils";

export const STEPS = [
  { number: 1, path: "paciente", label: "Paciente y cobertura" },
  { number: 2, path: "responsable", label: "Responsable y contactos" },
  { number: 3, path: "documentos", label: "Documentación" },
  { number: 4, path: "confirmar", label: "Revisar y confirmar" },
] as const;

export function stepHref(admissionId: string, step: number): Route {
  return `/ingresos/${admissionId}/${STEPS[step - 1]!.path}` as Route;
}

/** Carga un ingreso en curso para sus pantallas (admissions.manage). */
export async function loadDraftAdmission(admissionId: string) {
  const context = await requirePermission("admissions.manage");
  if (!z.uuid().safeParse(admissionId).success) notFound();
  const data = await inTenant(context, async (tx) => {
    const admission = await getAdmission(tx, admissionId);
    if (!admission) return null;
    const resident = await getResident(tx, admission.residentId);
    if (!resident) return null;
    return { admission, resident, contacts: await listContacts(tx, resident.id) };
  });
  if (!data) notFound();
  if (data.admission.status === "confirmed") redirect(`/pacientes/${data.resident.id}` as Route);
  if (data.admission.status === "cancelled") redirect("/ingresos");
  return { context, ...data };
}

/**
 * Pasos del ingreso (diseños Ingreso*): se puede volver a cualquiera ya
 * completado; los siguientes se abren al terminar el anterior.
 */
export function AdmissionSteps({
  admissionId,
  current,
  completed,
}: {
  admissionId: string;
  current: number;
  completed: number;
}) {
  return (
    <nav aria-label="Pasos del ingreso">
      <ol className="grid grid-cols-4 gap-1.5">
        {STEPS.map((step) => {
          const done = step.number <= completed;
          const reachable = step.number <= completed + 1;
          const content = (
            <>
              <span
                className={cn(
                  "h-1.5 rounded-full bg-muted",
                  (done || step.number === current) && "bg-primary",
                )}
              />
              <span className="flex items-center gap-1 text-[12px] leading-tight font-medium">
                {done && step.number !== current ? (
                  <Check aria-hidden="true" className="size-3.5 shrink-0" />
                ) : null}
                <span
                  className={cn(
                    step.number === current ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </span>
            </>
          );
          return (
            <li key={step.number}>
              {reachable && step.number !== current ? (
                <Link href={stepHref(admissionId, step.number)} className="flex flex-col gap-1.5">
                  {content}
                </Link>
              ) : (
                <span
                  className="flex flex-col gap-1.5"
                  aria-current={step.number === current ? "step" : undefined}
                >
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
