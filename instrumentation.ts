import type { Instrumentation } from "next";

/*
 * Observabilidad del servidor de Next.js (E16). Se carga una vez al
 * arrancar. Solo corre en Node.js: la app no usa el runtime Edge.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV === "production") {
    const { installConsoleRedaction } = await import("./lib/logger/console");
    installConsoleRedaction();
  }
}

/** Errores de pantallas, Server Actions y rutas: al log en JSON, sin datos personales. */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logRequestError } = await import("./lib/logger/request-error");
  logRequestError(error, request, context);
};
