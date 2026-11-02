import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthHeading } from "@/components/auth/auth-shell";
import { getMemberships, requireSession } from "@/lib/auth/session";

import { chooseOrganizationAction } from "./actions";

export const metadata: Metadata = { title: "Elegir residencia" };

export default async function ChooseOrganizationPage() {
  const current = await requireSession();
  const memberships = await getMemberships(current.user.id);
  if (memberships.length === 0) redirect("/sin-acceso");

  return (
    <>
      <AuthHeading
        title="Elegí la residencia"
        description="Trabajás en más de una. Los datos de cada residencia se ven por separado."
      />
      <ul className="flex flex-col gap-2.5">
        {memberships.map((membership) => (
          <li key={membership.organizationId}>
            <form action={chooseOrganizationAction}>
              <input type="hidden" name="organizationId" value={membership.organizationId} />
              <button
                type="submit"
                className="flex min-h-15 w-full items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                <span className="flex flex-col">
                  <span className="text-[15px] font-semibold">{membership.organizationName}</span>
                  <span className="text-[13px] text-muted-foreground">{membership.roleName}</span>
                </span>
                <ChevronRight aria-hidden="true" className="size-5 text-muted-foreground" />
              </button>
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
