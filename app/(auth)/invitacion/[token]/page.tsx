import type { Metadata, Route } from "next";
import Link from "next/link";

import { AuthHeading } from "@/components/auth/auth-shell";
import { buttonClassName } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { accountExists, findInvitationByToken, invitationState } from "@/lib/auth/invitations";
import { getCurrentSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

import { AcceptAsCurrentUserForm, AcceptInvitationForm } from "./invitation-forms";

export const metadata: Metadata = { title: "Invitación" };

const CLOSED_MESSAGES = {
  expired:
    "Esta invitación venció: el enlace dura 72 horas. Pedile a la administración que te mande una nueva.",
  accepted: "Esta invitación ya se usó. Ingresá con tu email y tu contraseña.",
  revoked: "Esta invitación se anuló. Si necesitás acceso, hablá con la administración.",
} as const;

export default async function InvitationPage({ params }: PageProps<"/invitacion/[token]">) {
  const { token } = await params;
  const db = getDb();
  const invitation = await findInvitationByToken(db, token);

  if (!invitation) {
    return (
      <ClosedInvitation message="Este enlace de invitación no es válido. Revisá que esté completo o pedile a la administración uno nuevo." />
    );
  }

  const state = invitationState(invitation, new Date());
  if (state !== "pending") return <ClosedInvitation message={CLOSED_MESSAGES[state]} />;

  if (!(await accountExists(db, invitation.email))) {
    return (
      <>
        <AuthHeading
          eyebrow={invitation.organizationName}
          title="Creá tu contraseña"
          description={
            <>
              Te invitaron con el rol <strong>{invitation.roleName}</strong>. Vas a ingresar con{" "}
              <strong>{invitation.email}</strong>.
            </>
          }
        />
        <AcceptInvitationForm token={token} defaultName={invitation.name} />
      </>
    );
  }

  const current = await getCurrentSession();
  if (current && current.user.email.toLowerCase() === invitation.email.toLowerCase()) {
    return (
      <>
        <AuthHeading
          eyebrow={invitation.organizationName}
          title={`Sumate a ${invitation.organizationName}`}
          description={
            <>
              Te invitaron con el rol <strong>{invitation.roleName}</strong>. Vas a poder elegir la
              residencia al ingresar.
            </>
          }
        />
        <AcceptAsCurrentUserForm token={token} />
      </>
    );
  }

  return (
    <>
      <AuthHeading
        eyebrow={invitation.organizationName}
        title="Ya tenés una cuenta"
        description={
          <>
            Ingresá con <strong>{invitation.email}</strong> y vas a volver a esta página para
            aceptar la invitación.
          </>
        }
      />
      <Link
        href={`/ingresar?volver=${encodeURIComponent(`/invitacion/${token}`)}` as Route}
        className={buttonClassName()}
      >
        Ingresar
      </Link>
    </>
  );
}

function ClosedInvitation({ message }: { message: string }) {
  return (
    <>
      <AuthHeading title="Invitación" />
      <Notice tone="info">{message}</Notice>
      <Link href="/ingresar" className={buttonClassName({ variant: "outline" })}>
        Ir al ingreso
      </Link>
    </>
  );
}
