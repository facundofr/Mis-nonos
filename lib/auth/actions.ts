"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "./server";

/** Cierra la sesión: la borra de la base y quita la cookie. */
export async function signOutAction(): Promise<void> {
  try {
    await getAuth().api.signOut({ headers: await headers() });
  } catch (error) {
    // Sin sesión no hay nada que cerrar.
    if (!(error instanceof APIError)) throw error;
  }
  redirect("/ingresar?motivo=salida");
}
