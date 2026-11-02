import type { Metadata } from "next";
import Link from "next/link";

import { buttonClassName } from "@/components/ui/button";

export const metadata: Metadata = { title: "Página no encontrada" };

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5 px-6 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">No encontramos esta página</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Puede que el enlace esté incompleto o que la página ya no exista.
        </p>
      </div>
      <Link href="/inicio" className={buttonClassName()}>
        Ir al inicio
      </Link>
    </main>
  );
}
