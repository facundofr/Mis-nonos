import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireAppContextForTwoFactorSetup } from "@/lib/auth/session";

import { TwoFactorSetup } from "./two-factor-setup";

export const metadata: Metadata = { title: "Verificación en dos pasos" };

export default async function EnableTwoFactorPage() {
  const context = await requireAppContextForTwoFactorSetup();
  if (context.user.twoFactorEnabled) redirect("/inicio");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Activá la verificación en dos pasos
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {context.needsTwoFactorSetup
            ? `Con el rol ${context.membership.roleName} es obligatoria: protege los datos de los residentes aunque alguien conozca tu contraseña.`
            : "Protege tu cuenta aunque alguien conozca tu contraseña."}{" "}
          Al ingresar, además de la contraseña vas a escribir un código de tu teléfono.
        </p>
      </div>
      <TwoFactorSetup />
    </div>
  );
}
