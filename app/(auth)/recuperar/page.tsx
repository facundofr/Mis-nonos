import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { RecoverForm } from "./recover-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecoverPage() {
  return (
    <>
      <Link
        href="/ingresar"
        className="-ml-2 inline-flex items-center gap-1.5 self-start rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Volver al ingreso
      </Link>
      <RecoverForm />
      <p className="text-center text-[13px] leading-normal text-muted-foreground">
        ¿Ya no tenés acceso a ese email, o entrás con usuario? Pedile a la administración que
        actualice tu usuario.
      </p>
    </>
  );
}
