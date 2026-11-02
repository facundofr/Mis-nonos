import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { listShifts } from "@/features/organizations/queries";
import { getMember } from "@/features/users/queries";
import { suggestTemporaryPassword } from "@/features/users/temporary-password";
import { inTenant } from "@/lib/actions";
import { requirePermission } from "@/lib/auth/authorization";
import { getSiteContext } from "@/lib/site/server";
import { shiftLabel } from "@/lib/time/shifts";

import { MemberForm, MemberStatusButton, ResetPasswordForm } from "../user-forms";

export const metadata: Metadata = { title: "Persona" };

export default async function MemberPage({ params, searchParams }: PageProps<"/usuarios/[id]">) {
  const context = await requirePermission("users.manage");
  const { id } = await params;
  const { creado } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();

  const site = await getSiteContext(context);
  const { member, shifts } = await inTenant(context, async (tx) => ({
    member: await getMember(tx, id),
    shifts: await listShifts(tx, site.site.id),
  }));
  if (!member) notFound();
  const isSelf = member.userId === context.user.id;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader title={member.name} back={{ href: "/usuarios", label: "Usuarios y roles" }} />

      {creado ? (
        <Notice tone="success">
          Usuario creado. Dale a {member.name} su usuario ({member.username}) y la contraseña
          provisoria: al entrar va a elegir una propia.
        </Notice>
      ) : null}

      <div className="flex items-center gap-3 rounded-[14px] border bg-card p-4">
        <Avatar name={member.name} size="lg" />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm text-muted-foreground">
            {member.email ?? `Entra con el usuario ${member.username}`}
          </span>
          <span className="flex flex-wrap gap-1.5">
            <Badge tone="primary">{member.roleName}</Badge>
            {member.status === "active" ? (
              <Badge tone="success">Activo</Badge>
            ) : (
              <Badge>Desactivado</Badge>
            )}
            {member.twoFactorEnabled ? <Badge tone="info">2FA activado</Badge> : null}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Rol y datos"
          description={
            isSelf ? "Tu propio rol lo cambia otra persona de Administración." : undefined
          }
        />
        <div className="p-5">
          <MemberForm
            membershipId={member.membershipId}
            defaults={member}
            shifts={shifts.map((shift) => ({ id: shift.id, label: shiftLabel(shift) }))}
          />
        </div>
      </Card>

      {!member.email && !isSelf ? (
        <Card>
          <CardHeader
            title="Contraseña"
            description="No tiene email: si se la olvida, le das una provisoria nueva."
          />
          <div className="p-5">
            <ResetPasswordForm
              membershipId={member.membershipId}
              suggestedPassword={suggestTemporaryPassword()}
            />
          </div>
        </Card>
      ) : null}

      {!isSelf ? (
        <Card>
          <CardHeader
            title={member.status === "active" ? "Desactivar" : "Reactivar"}
            description={
              member.status === "active"
                ? "Quita el acceso en el momento. No borra nada de lo que registró."
                : "Vuelve a tener acceso con el mismo rol."
            }
          />
          <div className="p-5">
            <MemberStatusButton
              membershipId={member.membershipId}
              active={member.status === "active"}
              name={member.name.split(" ")[0] ?? member.name}
            />
          </div>
        </Card>
      ) : null}
    </div>
  );
}
