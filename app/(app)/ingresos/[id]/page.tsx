import { redirect } from "next/navigation";

import { loadDraftAdmission, stepHref } from "../_shared";

/** Retomar un ingreso: va al primer paso que falta. */
export default async function AdmissionPage({ params }: PageProps<"/ingresos/[id]">) {
  const { id } = await params;
  const { admission } = await loadDraftAdmission(id);
  redirect(stepHref(id, Math.min(admission.currentStep + 1, 4)));
}
