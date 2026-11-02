import type { Instrumentation } from "next";

import { createLogger } from "./index";
import { scrubPath } from "./scrub";

type OnRequestError = Instrumentation.onRequestError;

// Sin lib/env: instrumentation.ts se carga antes que la app y no debe
// fallar por otra variable. El nivel sale directo del entorno.
const logger = createLogger({ service: "app", level: process.env.LOG_LEVEL || "info" });

export function logRequestError(
  error: unknown,
  request: Parameters<OnRequestError>[1],
  context: Parameters<OnRequestError>[2],
): void {
  logger.error(
    {
      err: error,
      request: { method: request.method, path: scrubPath(request.path) },
      route: { path: context.routePath, type: context.routeType },
    },
    "Error al atender un pedido",
  );
}
