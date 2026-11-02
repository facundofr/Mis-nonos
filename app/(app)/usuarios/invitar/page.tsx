import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/authorization";

import { InviteForm } from "../user-forms";

export const metadata: Metadata = { title: "Invitar usuario" };

/** Invitar usuario (diseño InvitarUsuario). */
export default async function InviteUserPage() {
  await requirePermission("users.manage");
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <PageHeader
        title="Invitar usuario"
        description="Para quien tiene email. Si la persona no usa email, creale un usuario."
        back={{ href: "/usuarios", label: "Usuarios y roles" }}
      />
      <div className="rounded-[14px] border bg-card p-5">
        <InviteForm />
      </div>
    </div>
  );
}
