import { eq } from "drizzle-orm";

import * as schema from "@/db/schema";
import { canReceiveEmail } from "@/lib/auth/identifiers";
import type { Database } from "@/lib/db/client";
import { withSystemTenant } from "@/lib/db/tenant";
import { resolveEmailConfig } from "@/lib/email/config";
import { ConsoleEmailSender, deliverEmail } from "@/lib/email/senders";
import { SmtpEmailSender } from "@/lib/email/smtp";
import { feeDueSoonDigestEmail } from "@/lib/email/templates";
import type { EmailSender } from "@/lib/email/types";
import type { parseServerEnv } from "@/lib/env/schema";
import type { FeeDigestJobData } from "@/lib/jobs/queues";

let sender: EmailSender | null = null;

function emailSender(env: ReturnType<typeof parseServerEnv>): EmailSender {
  if (!sender) {
    const config = resolveEmailConfig(env);
    sender = config.kind === "smtp" ? SmtpEmailSender.fromConfig(config) : new ConsoleEmailSender();
  }
  return sender;
}

/**
 * Email del día con los vencimientos del abono (7.3-C4, 12.10): solo la
 * cantidad, sin nombres ni montos. Quien entra con usuario (sin email) lo
 * ve solo en la campana.
 */
export async function sendFeeDigest(
  appDb: Database,
  env: ReturnType<typeof parseServerEnv>,
  data: FeeDigestJobData,
): Promise<boolean> {
  const [user] = await withSystemTenant(appDb, data.organizationId, (tx) =>
    tx
      .select({ email: schema.users.email, name: schema.users.name })
      .from(schema.users)
      .where(eq(schema.users.id, data.userId)),
  );
  if (!user?.email || !canReceiveEmail(user.email)) return false;
  return deliverEmail(
    emailSender(env),
    feeDueSoonDigestEmail({
      to: user.email,
      name: user.name.split(" ")[0] || user.name,
      count: data.count,
      days: data.days,
      url: new URL("/abonos", env.APP_URL).toString(),
    }),
  );
}
