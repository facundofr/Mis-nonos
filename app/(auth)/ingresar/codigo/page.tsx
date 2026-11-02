import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AuthHeading } from "@/components/auth/auth-shell";
import { TWO_FACTOR_COOKIE_NAMES } from "@/lib/auth/cookies";
import { safeRedirectPath } from "@/lib/auth/identifiers";

import { TwoFactorForm } from "./two-factor-form";

export const metadata: Metadata = { title: "Código de verificación" };

export default async function TwoFactorPage({ searchParams }: PageProps<"/ingresar/codigo">) {
  const params = await searchParams;
  const next = safeRedirectPath(params.volver);

  // Sin la cookie del paso anterior no hay ingreso en curso.
  const cookieStore = await cookies();
  if (!TWO_FACTOR_COOKIE_NAMES.some((name) => cookieStore.has(name))) {
    redirect("/ingresar?motivo=codigo-vencido");
  }

  return (
    <>
      <AuthHeading
        eyebrow="Verificación en dos pasos"
        title="Escribí el código"
        description="Abrí tu app de autenticación (por ejemplo, Google Authenticator) y escribí el código de 6 dígitos de este usuario."
      />
      <TwoFactorForm next={next} />
    </>
  );
}
