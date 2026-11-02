import "server-only";

import { env } from "@/lib/env";

import { createLogger, type Logger } from "./index";

// En desarrollo, Next.js recarga módulos: se guarda una sola instancia.
const globalForLogger = globalThis as unknown as { residencia360Logger?: Logger };

/** Logger de la app (Server Components, Server Actions y rutas). */
export const logger: Logger = (globalForLogger.residencia360Logger ??= createLogger({
  service: "app",
  level: env.LOG_LEVEL,
}));
