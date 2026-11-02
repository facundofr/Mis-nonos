import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { suggestTemporaryPassword } from "@/features/users/temporary-password";
import { requirePermission } from "@/lib/auth/authorization";

import { CreateWithoutEmailForm } from "../user-forms";

export const metadata: Metadata = { title: "Crear usuario sin email" };

/** Personal sin email (DC-11): usuario y contraseña provisoria que da Administración. */
export default async function CreateUserWithoutEmailPage() {
  await requirePermission("users.manage");
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <PageHeader
        title="Crear usuario sin email"
        description="Para quien no usa email: entra con un usuario. Si se olvida la contraseña, la restablecés desde su ficha."
        back={{ href: "/usuarios", label: "Usuarios y roles" }}
      />
      <div className="rounded-[14px] border bg-card p-5">
        <CreateWithoutEmailForm suggestedPassword={suggestTemporaryPassword()} />
      </div>
    </div>
  );
}
