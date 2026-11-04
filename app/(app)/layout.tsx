import type { ReactNode } from "react";

import { AppShell, GateShell } from "@/components/layout/app-shell";
import { visibleNavItems } from "@/components/layout/nav-items";
import { countUnread } from "@/features/notifications/service";
import { WELCOME_KEY, welcomeStepsFor } from "@/features/onboarding/content";
import { getSeenOnboarding } from "@/features/onboarding/server";
import { inTenant } from "@/lib/actions";
import { getPermissions } from "@/lib/auth/authorization";
import { requireAppContextWithGates } from "@/lib/auth/session";

import { WelcomeTour } from "./guia/welcome-tour";

/*
 * Marco de la app con sesión. La verificación de acceso la repite cada
 * página (el layout no se vuelve a ejecutar al navegar). Mientras falte un
 * paso obligatorio (contraseña provisoria o 2FA), solo se muestra ese paso.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const context = await requireAppContextWithGates();
  if (context.needsPasswordChange || context.needsTwoFactorSetup) {
    return <GateShell organizationName={context.membership.organizationName}>{children}</GateShell>;
  }

  const [permissions, unread, seen] = await Promise.all([
    getPermissions(context),
    inTenant(context, (tx) => countUnread(tx, context.user.id)),
    getSeenOnboarding(context),
  ]);
  // Guía de la primera vez (onboarding), según lo que puede hacer el rol.
  const welcome = seen.has(WELCOME_KEY)
    ? null
    : welcomeStepsFor(permissions).map(({ anyOf: _anyOf, ...step }) => step);

  return (
    <AppShell
      organizationName={context.membership.organizationName}
      userName={context.user.name}
      roleName={context.membership.roleName}
      roleTitle={context.membership.roleTitle}
      items={visibleNavItems(permissions)}
      unreadNotifications={unread}
    >
      {welcome ? (
        <WelcomeTour
          steps={welcome}
          organizationName={context.membership.organizationName}
          firstName={context.user.name.split(" ")[0] || context.user.name}
        />
      ) : null}
      {children}
    </AppShell>
  );
}
