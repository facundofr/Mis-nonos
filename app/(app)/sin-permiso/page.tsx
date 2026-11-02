import type { Metadata } from "next";
import Link from "next/link";

import { buttonClassName } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { requireAppContext } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sin permiso" };

// Destino de requirePermission() cuando el rol no tiene el permiso (F.3).
export default async function NoPermissionPage() {
  const { membership } = await requireAppContext();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 py-4">
      <h1 className="text-2xl font-semibold tracking-tight">Sin permiso</h1>
      <Notice tone="info">
        Con el rol {membership.roleName} no podés ver esa pantalla. Si la necesitás, pedíselo a la
        administración.
      </Notice>
      <Link href="/inicio" className={buttonClassName({ variant: "outline" })}>
        Volver al inicio
      </Link>
    </div>
  );
}
