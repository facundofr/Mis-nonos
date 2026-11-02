"use server";

import { redirect } from "next/navigation";

import { getMemberships, requireSession, setActiveOrganization } from "@/lib/auth/session";

/** Fija la residencia de la sesión, solo si la persona trabaja en ella. */
export async function chooseOrganizationAction(formData: FormData): Promise<void> {
  const current = await requireSession();
  const organizationId = String(formData.get("organizationId") ?? "");
  const memberships = await getMemberships(current.user.id);
  if (memberships.some((membership) => membership.organizationId === organizationId)) {
    await setActiveOrganization(current.session.id, organizationId);
    redirect("/inicio");
  }
  redirect("/elegir-residencia");
}
