import "server-only";

import { getDb } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { passwordResetEmail } from "@/lib/email/templates";
import { env } from "@/lib/env";

import { createAuth, type Auth } from "./create-auth";

// En desarrollo, Next.js recarga módulos: se guarda una sola instancia.
const globalForAuth = globalThis as unknown as { residencia360Auth?: Auth };

/** Better Auth de la app. Se crea al primer uso, no al compilar. */
export function getAuth(): Auth {
  if (!globalForAuth.residencia360Auth) {
    if (!env.BETTER_AUTH_SECRET) {
      throw new Error("Falta la variable BETTER_AUTH_SECRET.");
    }
    globalForAuth.residencia360Auth = createAuth({
      db: getDb(),
      secret: env.BETTER_AUTH_SECRET,
      baseURL: env.APP_URL,
      sendPasswordReset: async ({ email, name, url }) => {
        await sendEmail(passwordResetEmail({ to: email, name, url }));
      },
    });
  }
  return globalForAuth.residencia360Auth;
}

/** Hashea una contraseña con el mismo algoritmo que usa Better Auth al verificarla. */
export async function hashPassword(password: string): Promise<string> {
  const context = await getAuth().$context;
  return context.password.hash(password);
}
