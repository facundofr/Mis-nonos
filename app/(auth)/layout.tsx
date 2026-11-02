import type { ReactNode } from "react";

import { AuthShell } from "@/components/auth/auth-shell";

// Pantallas de ingreso: ingresar, código 2FA, recuperar y restablecer la
// contraseña, invitaciones y elección de residencia.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
