import { Lock } from "lucide-react";
import type { Metadata } from "next";

import { AuthHeading } from "@/components/auth/auth-shell";
import { Notice, type NoticeTone } from "@/components/ui/notice";
import { safeRedirectPath } from "@/lib/auth/identifiers";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar" };

const REASONS: Record<string, { tone: NoticeTone; text: string }> = {
  vencida: { tone: "info", text: "Tu sesión venció. Volvé a ingresar." },
  inactividad: { tone: "info", text: "Cerramos tu sesión después de 8 horas sin uso." },
  salida: { tone: "success", text: "Cerraste la sesión." },
  "contrasena-actualizada": {
    tone: "success",
    text: "Tu contraseña se actualizó. Ya podés ingresar.",
  },
  "codigo-vencido": {
    tone: "info",
    text: "Pasó mucho tiempo antes de escribir el código. Volvé a ingresar.",
  },
};

export default async function LoginPage({ searchParams }: PageProps<"/ingresar">) {
  const params = await searchParams;
  const next = safeRedirectPath(params.volver);
  const reason = typeof params.motivo === "string" ? REASONS[params.motivo] : undefined;

  return (
    <>
      <AuthHeading
        eyebrow="Personal de la residencia"
        title="Ingresar"
        description="Usá tu email, o el usuario que te dio la administración."
      />
      {reason ? <Notice tone={reason.tone}>{reason.text}</Notice> : null}
      <LoginForm next={next} />
      <p className="flex items-start gap-2.5 rounded-[10px] bg-muted p-3.5 text-[13px] leading-normal text-muted-foreground">
        <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Cada persona entra con su propio usuario: así cada registro queda firmado. No compartas tu
        contraseña.
      </p>
    </>
  );
}
