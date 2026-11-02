import "server-only";

import { parseServerEnv } from "./schema";

/** Variables de entorno validadas. Solo se pueden importar desde el servidor. */
export const env = parseServerEnv(process.env);
