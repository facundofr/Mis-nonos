import { and, eq } from "drizzle-orm";

import * as schema from "@/db/schema";
import type { Database } from "@/lib/db/client";
import { withSystemTenant } from "@/lib/db/tenant";
import { resolveEmailConfig } from "@/lib/email/config";
import { ConsoleEmailSender, deliverEmail } from "@/lib/email/senders";
import { SmtpEmailSender } from "@/lib/email/smtp";
import { admissionRequestReceivedEmail } from "@/lib/email/templates";
import type { EmailSender } from "@/lib/email/types";
import type { parseServerEnv } from "@/lib/env/schema";
import type { DomainEventJobData } from "@/lib/jobs/queues";

let sender: EmailSender | null = null;

function emailSender(env: ReturnType<typeof parseServerEnv>): EmailSender {
  if (!sender) {
    const config = resolveEmailConfig(env);
    sender = config.kind === "smtp" ? SmtpEmailSender.fromConfig(config) : new ConsoleEmailSender();
  }
  return sender;
}

/**
 * Acuse a la familia (DC-16): solo para solicitudes del formulario público
 * que dejaron un email. Genérico, sin datos del futuro residente. Las
 * cargadas a mano por el personal no generan email.
 */
export async function sendAdmissionRequestReceipt(
  appDb: Database,
  env: ReturnType<typeof parseServerEnv>,
  data: DomainEventJobData,
): Promise<boolean> {
  if (data.payload.origin !== "landing" || !data.entityId) return false;
  const requestId = data.entityId;
  const [found] = await withSystemTenant(appDb, data.organizationId, (tx) =>
    tx
      .select({ email: schema.admissionRequests.responsibleEmail, siteName: schema.sites.name })
      .from(schema.admissionRequests)
      .innerJoin(schema.sites, eq(schema.sites.id, schema.admissionRequests.siteId))
      .where(
        and(
          eq(schema.admissionRequests.id, requestId),
          eq(schema.admissionRequests.origin, "landing"),
        ),
      ),
  );
  if (!found?.email) return false;
  return deliverEmail(
    emailSender(env),
    admissionRequestReceivedEmail({ to: found.email, siteName: found.siteName }),
  );
}
