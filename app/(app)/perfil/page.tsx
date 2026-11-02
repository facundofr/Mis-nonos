import { and, eq } from "drizzle-orm";
import { Lightbulb, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import * as schema from "@/db/schema";
import { inTenant } from "@/lib/actions";
import { requireAppContext } from "@/lib/auth/session";

import { resetOnboardingAction } from "../guia/actions";
import { PasswordForm, ProfileForm } from "./profile-forms";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const context = await requireAppContext();
  const membership = await inTenant(context, async (tx) => {
    const [row] = await tx
      .select({ phone: schema.organizationMemberships.phone })
      .from(schema.organizationMemberships)
      .where(
        and(
          eq(schema.organizationMemberships.userId, context.user.id),
          eq(schema.organizationMemberships.organizationId, context.tenant.organizationId),
        ),
      );
    return row;
  });
  const login = context.user.username ?? context.user.email;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mi perfil"
        description={`${context.membership.roleName} · Ingresás con ${login}`}
        back={{ href: "/mas", label: "Más" }}
      />
      {context.user.twoFactorEnabled ? (
        <p className="flex items-center gap-2 text-sm font-medium text-success-foreground">
          <ShieldCheck aria-hidden="true" className="size-4" />
          Verificación en dos pasos activada
        </p>
      ) : null}
      <Card>
        <CardHeader title="Mis datos" />
        <div className="p-5">
          <ProfileForm name={context.user.name} phone={membership?.phone ?? null} />
        </div>
      </Card>
      <Card>
        <CardHeader
          title="Contraseña"
          description="Al cambiarla se cierran tus sesiones en otros dispositivos."
        />
        <div className="p-5">
          <PasswordForm />
        </div>
      </Card>
      <form action={resetOnboardingAction}>
        <button
          type="submit"
          className="flex h-11 w-fit items-center gap-2 rounded-lg border bg-card px-4 text-[15px] font-medium hover:bg-muted/60"
        >
          <Lightbulb aria-hidden="true" className="size-5" />
          Volver a ver la guía
        </button>
      </form>
    </div>
  );
}
