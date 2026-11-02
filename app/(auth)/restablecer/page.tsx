import type { Metadata } from "next";
import Link from "next/link";

import { AuthHeading } from "@/components/auth/auth-shell";
import { buttonClassName } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/restablecer">) {
  const { token } = await searchParams;

  if (typeof token !== "string" || token.length === 0) {
    return (
      <>
        <AuthHeading title="Nueva contraseña" />
        <Notice tone="error">
          Este enlace no es válido. Abrí el enlace completo del email, o pedí uno nuevo.
        </Notice>
        <Link href="/recuperar" className={buttonClassName({ variant: "outline" })}>
          Pedir un enlace nuevo
        </Link>
      </>
    );
  }

  return (
    <>
      <AuthHeading
        title="Creá una contraseña nueva"
        description="Al guardarla se cierran las sesiones abiertas con la contraseña anterior."
      />
      <ResetForm token={token} />
    </>
  );
}
