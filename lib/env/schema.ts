import { z } from "zod";

/** En los archivos .env, una variable vacía (`SMTP_HOST=`) cuenta como no definida. */
const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

function optional<T extends z.ZodType>(schema: T) {
  return z.preprocess(emptyToUndefined, schema.optional());
}

const postgresUrl = z.string().regex(/^postgres(ql)?:\/\//, "debe ser una URL postgres://");

/** Variables de entorno del servidor (app y worker). Se amplía en cada etapa. */
export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  // Conexión con el rol de la app (sin BYPASSRLS). Se exige al primer uso
  // de la base (lib/db), no al arrancar, para que el build no la necesite.
  DATABASE_URL: optional(postgresUrl),
  // Solo el worker: rol dueño del esquema de la cola (pg-boss).
  DATABASE_URL_WORKER: optional(postgresUrl),

  // Firma las cookies y cifra los secretos del 2FA; de él se deriva también
  // la clave de los enlaces temporales a archivos. Se exige al primer uso.
  BETTER_AUTH_SECRET: optional(z.string().min(32, "debe tener al menos 32 caracteres")),

  // 2FA obligatoria para Administración y Dirección. Con "false" deja de
  // exigirse (cada persona puede activarla igual desde su perfil).
  REQUIRE_PRIVILEGED_2FA: z.preprocess(
    emptyToUndefined,
    z
      .enum(["true", "false"])
      .default("true")
      .transform((value) => value === "true"),
  ),

  // Email (SMTP). Sin SMTP_HOST, en desarrollo los emails van a la consola;
  // en producción es obligatorio (lib/email/config.ts).
  SMTP_HOST: optional(z.string()),
  SMTP_PORT: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(65_535).default(587),
  ),
  // starttls: puerto 587; tls: puerto 465; none: solo Mailpit en desarrollo.
  SMTP_SECURITY: z.enum(["starttls", "tls", "none"]).default("starttls"),
  SMTP_USER: optional(z.string()),
  SMTP_PASSWORD: optional(z.string()),
  // Remitente, p. ej. "Mis Nonos <avisos@dominio>". El dominio necesita SPF, DKIM y DMARC.
  EMAIL_FROM: optional(z.string()),

  // Dirección de la landing que se muestra en la raíz del dominio a quien no
  // tiene sesión (la lee proxy.ts). Vacía: la raíz lleva al ingreso.
  HOME_LANDING_SLUG: optional(
    z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "solo minúsculas, números y guiones"),
  ),

  // Carpeta privada de las fotos del legajo (DC-08). Nunca dentro de public/.
  STORAGE_DIR: z.string().default("storage"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Valida las variables de entorno. Si falla, el error nombra las variables
 * y el motivo, nunca su valor (puede ser un secreto).
 */
export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Variables de entorno inválidas: ${issues}`);
  }
  return result.data;
}
