import { ChevronRight, MailPlus, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { listMembers, listPendingInvitations, type MemberRow } from "@/features/users/queries";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";
import { SYSTEM_ROLES } from "@/lib/auth/policy";
import { formatDateTime } from "@/lib/time/format";

import { InvitationActions } from "./user-forms";
import { PageTip } from "../guia/page-tip";

export const metadata: Metadata = { title: "Usuarios y roles" };

const STATUS: Record<
  MemberRow["status"],
  { label: string; tone: "success" | "warning" | "neutral" }
> = {
  active: { label: "Activo", tone: "success" },
  invited: { label: "Invitación pendiente", tone: "warning" },
  disabled: { label: "Desactivado", tone: "neutral" },
};

/** Usuarios y roles (diseño MovilUsuarios). Solo Administración (users.manage). */
export default async function UsersPage() {
  const context = await requirePermission("users.manage");
  const { members, invitations } = await inTenant(context, async (tx) => ({
    members: await listMembers(tx),
    invitations: await listPendingInvitations(tx),
  }));
  const active = members.filter((member) => member.status === "active");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Usuarios y roles"
        back={{ href: "/mas", label: "Más" }}
        actions={
          <>
            <Link href="/usuarios/agregar" className={buttonClassName({ size: "md" })}>
              <MailPlus aria-hidden="true" className="size-4" />
              Agregar usuario
            </Link>
            <Link
              href="/usuarios/nuevo"
              className={buttonClassName({ size: "md", variant: "outline" })}
            >
              <UserPlus aria-hidden="true" className="size-4" />
              Crear sin email
            </Link>
          </>
        }
      />
      <PageTip context={context} tip="usuarios" />

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Personas activas por rol">
        {SYSTEM_ROLES.map((role) => (
          <li key={role.key} className="flex flex-col rounded-xl border bg-card px-3.5 py-2.5">
            <span className="text-xl font-semibold">
              {active.filter((member) => member.roleKey === role.key).length}
            </span>
            <span className="text-[13px] text-muted-foreground">{role.name}</span>
          </li>
        ))}
      </ul>

      {invitations.length > 0 ? (
        <Card>
          <CardHeader title="Invitaciones pendientes" />
          <ul className="divide-y">
            {invitations.map((invitation) => (
              <li
                key={invitation.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-semibold">{invitation.name}</span>
                  <span className="truncate text-sm text-muted-foreground">
                    {invitation.email} · {invitation.roleName}
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    {invitation.expired
                      ? "Venció: reenviala para que pueda entrar."
                      : `Vence ${formatDateTime(invitation.expiresAt)}`}
                  </span>
                </div>
                <InvitationActions invitationId={invitation.id} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <ul className="flex flex-col gap-2">
        {members.map((member) => {
          const status = STATUS[member.status];
          return (
            <li key={member.membershipId}>
              <Link
                href={`/usuarios/${member.membershipId}`}
                className="flex items-center gap-3 rounded-[14px] border bg-card p-3.5 hover:bg-muted/60 data-[disabled=true]:opacity-70"
                data-disabled={member.status === "disabled"}
              >
                <Avatar name={member.name} />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate font-semibold">{member.name}</span>
                  <span className="truncate text-sm text-muted-foreground">
                    {member.email ?? `Usuario: ${member.username}`}
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    <Badge tone="primary">{member.roleName}</Badge>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-5 shrink-0 text-muted-foreground"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
