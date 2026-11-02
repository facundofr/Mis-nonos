import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Notice } from "@/components/ui/notice";
import { requireAppContextWithGates } from "@/lib/auth/session";

import { PasswordForm } from "../perfil/profile-forms";

export const metadata: Metadata = { title: "Elegí tu contraseña" };

/**
 * Contraseña provisoria (DC-11): Administración creó la cuenta o la
 * restableció. Antes de usar la app, la persona elige una propia.
 */
export default async function ForcedPasswordChangePage() {
  const context = await requireAppContextWithGates();
  if (!context.needsPasswordChange) redirect("/inicio");
  const firstName = context.user.name.split(" ")[0] || context.user.name;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Hola, {firstName}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Entraste con una contraseña que te dio la administración. Para seguir, elegí una propia:
          solo vos la vas a conocer.
        </p>
      </div>
      <Notice tone="info">
        Cada persona entra con su usuario: así cada registro queda a tu nombre. No la compartas.
      </Notice>
      <div className="rounded-[14px] border bg-card p-5">
        <PasswordForm forced />
      </div>
    </div>
  );
}
