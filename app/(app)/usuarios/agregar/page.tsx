import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/authorization";

import { CreateWithEmailForm } from "../user-forms";

export const metadata: Metadata = { title: "Agregar usuario" };

/**
 * Agregar usuario (docs/decisions/0018): nombre, email y rol. La contraseña
 * provisoria llega por email; al primer ingreso la persona elige la suya.
 */
export default async function AddUserPage() {
  await requirePermission("users.manage");
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <PageHeader
        title="Agregar usuario"
        description="Le llega una contraseña provisoria por email. Al entrar, elige una propia."
        back={{ href: "/usuarios", label: "Usuarios y roles" }}
      />
      <div className="rounded-[14px] border bg-card p-5">
        <CreateWithEmailForm />
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        ¿No tiene email?{" "}
        <Link href="/usuarios/nuevo" className="font-medium text-primary-ink underline">
          Creale un usuario sin email
        </Link>
        . ¿Preferís mandarle un enlace para que cree su contraseña?{" "}
        <Link href="/usuarios/invitar" className="font-medium text-primary-ink underline">
          Invitar con enlace
        </Link>
        .
      </p>
    </div>
  );
}
