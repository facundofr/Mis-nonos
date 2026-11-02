"use server";

import type { Route } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { looksAutomated } from "@/features/public-intake/guard";
import { publicRequestSchema } from "@/features/public-intake/schemas";
import { formTokenSecret, publicIntakeLimiters } from "@/features/public-intake/server";
import { submitPublicRequest } from "@/features/public-intake/service";
import { clientIp, tooManyAttemptsMessage } from "@/lib/auth/limiters";
import { getDb } from "@/lib/db";
import { fieldErrorsFrom, formValues, type FormState } from "@/lib/forms";
import { logger } from "@/lib/logger/server";
import { serializeError } from "@/lib/logger";

/*
 * Envío del formulario público (12.9). Sin sesión: no pasa por runAction.
 * En orden: robots (campo oculto y sello), límites por IP y por residencia,
 * validación y guardado con el rol que solo agrega. Los logs no llevan nada
 * de lo que escribió la familia.
 */
export async function submitPublicRequestAction(
  slug: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const sent = `/residencia/${encodeURIComponent(slug)}/enviada` as Route;
  const values = formValues(formData, ["sello", "sitioWeb", "clientRequestId"]);

  const bot = looksAutomated(formData, formTokenSecret());
  if (bot.automated) {
    logger.info({ reason: bot.reason }, "Formulario público: envío automático descartado");
    // La misma respuesta que un envío correcto: no le da pistas al robot.
    redirect(sent);
  }

  const ip = clientIp(await headers());
  const byIp = publicIntakeLimiters.byIp.check(ip);
  const bySite = publicIntakeLimiters.bySite.check(slug);
  if (!byIp.allowed || !bySite.allowed) {
    logger.warn({ limit: byIp.allowed ? "site" : "ip" }, "Formulario público: límite de envíos");
    return {
      error: tooManyAttemptsMessage(Math.max(byIp.retryAfterSeconds, bySite.retryAfterSeconds)),
      values,
    };
  }

  const parsed = publicRequestSchema.safeParse(formValues(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  const clientRequestId = formData.get("clientRequestId");

  let result: Awaited<ReturnType<typeof submitPublicRequest>>;
  try {
    result = await submitPublicRequest(getDb(), slug, parsed.data, String(clientRequestId ?? ""));
  } catch (error) {
    logger.error({ err: serializeError(error) }, "Formulario público: no se pudo guardar");
    return {
      error: "No se pudo enviar. Probá de nuevo en unos minutos o llamá a la residencia.",
      values,
    };
  }
  if (result === "not_found") notFound();
  publicIntakeLimiters.byIp.recordFailure(ip);
  publicIntakeLimiters.bySite.recordFailure(slug);
  redirect(sent);
}
