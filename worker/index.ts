/*
 * Worker de trabajos en segundo plano (pg-boss, E15). Proceso aparte de la
 * app: pasa los eventos de dominio a la cola, corre los trabajos y los
 * programados (limpieza diaria; en la Etapa 3, los avisos del abono).
 *
 * Desarrollo: corepack pnpm worker (lee .env.local).
 * Producción: node dist/worker/index.cjs (corepack pnpm worker:build).
 */
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { sql } from "drizzle-orm";
import { PgBoss } from "pg-boss";

import { createDb, createPool } from "@/lib/db/client";
import { parseServerEnv } from "@/lib/env/schema";
import {
  notifyAdmissionRequestCreated,
  notifyEmergencyViewed,
} from "@/features/notifications/service";
import { runDailyFees } from "@/features/fees/daily";
import { recordAudit } from "@/lib/audit";
import { sendAdmissionRequestReceipt } from "./jobs/admission-request-receipt";
import { sendFeeDigest } from "./jobs/fee-digest";
import { withSystemTenant } from "@/lib/db/tenant";
import {
  DEAD_LETTER_QUEUE,
  EVENT_SUBSCRIPTIONS,
  QUEUES,
  type DomainEventJobData,
  type FeeDigestJobData,
} from "@/lib/jobs/queues";
import { createLogger, serializeError, type Logger } from "@/lib/logger";

import { cleanupExpiredAuth } from "./jobs/auth-cleanup";
import { purgeStaleAdmissionRequests } from "./jobs/purge-admission-requests";
import { relayDomainEvents } from "./relay";

/** Zona horaria de los trabajos programados del sistema. */
const SYSTEM_TIMEZONE = "America/Argentina/Buenos_Aires";
const RELAY_BATCH_SIZE = 100;
const RELAY_INTERVAL_MS = 5_000;
/** Archivo que el healthcheck de Docker mira para saber si el worker sigue vivo. */
const HEARTBEAT_FILE = path.join(tmpdir(), "residencia360-worker.alive");

function loadEnv() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Sin .env.local: se usan las variables del entorno (producción).
  }
  return parseServerEnv(process.env);
}

async function main() {
  const env = loadEnv();
  const logger = createLogger({ service: "worker", level: env.LOG_LEVEL });
  if (!env.DATABASE_URL || !env.DATABASE_URL_WORKER) {
    logger.fatal("Faltan DATABASE_URL (rol de la app) y DATABASE_URL_WORKER (rol del worker).");
    process.exitCode = 1;
    return;
  }

  // Dos conexiones con permisos distintos: la del worker solo ve la cola y
  // los eventos; el trabajo de cada residencia va con el rol de la app.
  const appPool = createPool(env.DATABASE_URL, {
    application_name: "residencia360-worker-app",
    max: 5,
    statement_timeout: 30_000,
  });
  const workerPool = createPool(env.DATABASE_URL_WORKER, {
    application_name: "residencia360-worker-relay",
    max: 2,
  });
  const appDb = createDb(appPool);
  const workerDb = createDb(workerPool);

  const boss = new PgBoss({
    connectionString: env.DATABASE_URL_WORKER,
    schema: "pgboss",
    // El esquema ya existe y es del rol del worker (db/init/01-roles.sh).
    createSchema: false,
    application_name: "residencia360-worker-queue",
    max: 5,
    instanceName: "worker",
  });
  boss.on("error", (error) => logger.error({ err: error }, "Error de la cola de trabajos"));
  boss.on("warning", (warning) =>
    logger.warn({ warning: warning.message }, "Aviso de la cola de trabajos"),
  );

  await boss.start({ attempts: 5 });
  await registerQueues(boss, appDb, workerDb, logger, env);
  logger.info("Worker en marcha");

  const controller = new AbortController();
  const relay = runRelayLoop(workerDb, boss, logger, controller.signal);

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    logger.info({ signal }, "Apagando el worker: termina los trabajos en curso");
    controller.abort();
    await relay;
    // graceful: espera los trabajos activos hasta 30 s antes de cortar (10.16).
    await boss.stop({ graceful: true, timeout: 30_000 });
    await Promise.all([appPool.end(), workerPool.end()]);
    logger.info("Worker detenido");
  };
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}

/** Crea las colas (no hace nada si ya existen), sus manejadores y los programados. */
async function registerQueues(
  boss: PgBoss,
  appDb: ReturnType<typeof createDb>,
  workerDb: ReturnType<typeof createDb>,
  logger: Logger,
  env: ReturnType<typeof parseServerEnv>,
) {
  // Los trabajos que agotan sus reintentos quedan acá 30 días para revisarlos.
  await boss.createQueue(DEAD_LETTER_QUEUE, { deleteAfterSeconds: 30 * 24 * 3600 });
  for (const queue of Object.values(QUEUES)) {
    await boss.createQueue(queue.name, {
      retryLimit: queue.retryLimit,
      retryDelay: queue.retryDelay,
      retryBackoff: true,
      retryDelayMax: queue.retryDelayMax,
      expireInSeconds: queue.expireInSeconds,
      deadLetter: DEAD_LETTER_QUEUE,
    });
  }

  await boss.work(
    QUEUES.authCleanup.name,
    safe(logger, QUEUES.authCleanup.name, async () => {
      const deleted = await cleanupExpiredAuth(appDb);
      logger.info(deleted, "Credenciales vencidas borradas");
    }),
  );
  await boss.work<DomainEventJobData>(
    QUEUES.notifyEmergencyViewed.name,
    safe(
      logger,
      QUEUES.notifyEmergencyViewed.name,
      async (jobs: { data: DomainEventJobData }[]) => {
        for (const job of jobs) {
          const { eventId, organizationId, entityId, payload } = job.data;
          if (!entityId) continue;
          const created = await withSystemTenant(appDb, organizationId, (tx) =>
            notifyEmergencyViewed(tx, {
              eventId,
              organizationId,
              residentId: entityId,
              viewerUserId: typeof payload.viewerUserId === "string" ? payload.viewerUserId : null,
            }),
          );
          logger.debug({ created }, "Avisos de ficha de emergencia abierta");
        }
      },
    ),
  );

  await boss.work<DomainEventJobData>(
    QUEUES.notifyAdmissionRequest.name,
    safe(
      logger,
      QUEUES.notifyAdmissionRequest.name,
      async (jobs: { data: DomainEventJobData }[]) => {
        for (const job of jobs) {
          const { eventId, organizationId, entityId, payload } = job.data;
          if (!entityId) continue;
          const created = await withSystemTenant(appDb, organizationId, (tx) =>
            notifyAdmissionRequestCreated(tx, {
              eventId,
              organizationId,
              requestId: entityId,
              createdBy: typeof payload.createdBy === "string" ? payload.createdBy : null,
            }),
          );
          logger.debug({ created }, "Avisos de solicitud de ingreso nueva");
        }
      },
    ),
  );
  await boss.work<DomainEventJobData>(
    QUEUES.emailAdmissionRequestReceipt.name,
    safe(
      logger,
      QUEUES.emailAdmissionRequestReceipt.name,
      async (jobs: { data: DomainEventJobData }[]) => {
        for (const job of jobs) {
          const sent = await sendAdmissionRequestReceipt(appDb, env, job.data);
          logger.debug({ sent }, "Acuse de solicitud a la familia");
        }
      },
    ),
  );
  await boss.work(
    QUEUES.purgeAdmissionRequests.name,
    safe(logger, QUEUES.purgeAdmissionRequests.name, async () => {
      const purged = await purgeStaleAdmissionRequests(workerDb, appDb, recordAudit);
      logger.info({ purged }, "Solicitudes de ingreso vencidas borradas");
    }),
  );

  await boss.work(
    QUEUES.feesDaily.name,
    safe(logger, QUEUES.feesDaily.name, async () => {
      const now = new Date();
      const date = now.toLocaleDateString("sv-SE", { timeZone: SYSTEM_TIMEZONE });
      const organizations = await workerDb.execute<{ organization_id: string }>(
        sql`select organization_id from app.organizations_with_module('fees')`,
      );
      for (const { organization_id: organizationId } of organizations.rows) {
        const result = await withSystemTenant(appDb, organizationId, (tx) =>
          runDailyFees(tx, organizationId, now),
        );
        for (const [userId, reminder] of result.newReminders) {
          // Un email por persona y por día, aunque el trabajo se reintente.
          await boss.send(
            QUEUES.emailFeeDigest.name,
            { organizationId, userId, date, ...reminder } satisfies FeeDigestJobData,
            { singletonKey: `${userId}:${date}` },
          );
        }
        logger.info(
          {
            chargesCreated: result.chargesCreated,
            chargesVoided: result.chargesVoided,
            reminded: result.newReminders.size,
          },
          "Abono: cuotas y avisos del día",
        );
      }
    }),
  );
  await boss.work<FeeDigestJobData>(
    QUEUES.emailFeeDigest.name,
    safe(logger, QUEUES.emailFeeDigest.name, async (jobs: { data: FeeDigestJobData }[]) => {
      for (const job of jobs) {
        const sent = await sendFeeDigest(appDb, env, job.data);
        logger.debug({ sent }, "Email de vencimientos del abono");
      }
    }),
  );

  // Todos los días a las 03:15, cuando casi no hay uso.
  await boss.schedule(QUEUES.authCleanup.name, "15 3 * * *", null, { tz: SYSTEM_TIMEZONE });
  // Cuotas y avisos del abono: 08:00 (7.3-C4).
  await boss.schedule(QUEUES.feesDaily.name, "0 8 * * *", null, { tz: SYSTEM_TIMEZONE });
  await boss.schedule(QUEUES.purgeAdmissionRequests.name, "45 3 * * *", null, {
    tz: SYSTEM_TIMEZONE,
  });
}

/**
 * Envuelve un manejador: si falla, registra el error limpio y vuelve a
 * lanzar uno sin detalles de la consulta, porque pg-boss guarda el error en
 * la cola (podría traer valores de la base).
 */
function safe<A extends unknown[]>(
  logger: Logger,
  queue: string,
  handler: (...args: A) => Promise<void>,
): (...args: A) => Promise<void> {
  return async (...args: A) => {
    try {
      await handler(...args);
    } catch (error) {
      logger.error({ err: error, queue }, "Falló un trabajo de la cola");
      const safeError = serializeError(error);
      throw new Error(
        `${safeError.message}${safeError.code ? ` (código ${safeError.code})` : ""}${
          safeError.cause?.code ? ` (código ${safeError.cause.code})` : ""
        }`,
      );
    }
  };
}

/** Pasa los eventos de dominio a la cola cada pocos segundos, hasta que se apague el worker. */
async function runRelayLoop(
  workerDb: ReturnType<typeof createDb>,
  boss: PgBoss,
  logger: Logger,
  signal: AbortSignal,
): Promise<void> {
  while (!signal.aborted) {
    let relayed = 0;
    try {
      relayed = await relayDomainEvents(workerDb, boss, EVENT_SUBSCRIPTIONS, RELAY_BATCH_SIZE);
      if (relayed > 0) logger.debug({ relayed }, "Eventos de dominio pasados a la cola");
      await writeFile(HEARTBEAT_FILE, new Date().toISOString());
    } catch (error) {
      logger.error({ err: error }, "No se pudieron pasar los eventos de dominio a la cola");
    }
    // Si el lote vino lleno, hay más pendientes: sigue sin esperar.
    if (relayed === RELAY_BATCH_SIZE) continue;
    try {
      await delay(RELAY_INTERVAL_MS, undefined, { signal });
    } catch {
      // Abortado: el worker se está apagando.
    }
  }
}

main().catch((error: unknown) => {
  // pino escribe en forma sincrónica: el log sale antes de terminar.
  createLogger({ service: "worker" }).fatal({ err: error }, "El worker no pudo arrancar");
  process.exit(1);
});
