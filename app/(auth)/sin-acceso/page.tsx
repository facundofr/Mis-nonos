import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthHeading } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { signOutAction } from "@/lib/auth/actions";
import { getMemberships, requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sin acceso" };

export default async function NoAccessPage() {
  const current = await requireSession();
  const memberships = await getMemberships(current.user.id);
  if (memberships.length > 0) redirect("/inicio");

  return (
    <>
      <AuthHeading title="Sin acceso a una residencia" />
      <Notice tone="info">
        Tu usuario no tiene acceso a ninguna residencia activa. Pedile a la administración que
        revise tu invitación o tu rol.
      </Notice>
      <form action={signOutAction}>
        <Button type="submit" variant="outline" className="w-full">
          Salir
        </Button>
      </form>
    </>
  );
}
