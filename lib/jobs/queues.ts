/*
 * Colas de trabajos en segundo plano (pg-boss, E15). Los trabajos llevan
 * identificadores, nunca datos personales: el worker busca el resto en la
 * base, con withSystemTenant y las políticas RLS de la residencia.
 */

/** Opciones de cola que usa este proyecto (subconjunto de las de pg-boss). */
export interface QueueDefinition {
  name: string;
  /** Reintentos después del primer intento fallido. */
  retryLimit: number;
  /** Espera antes del primer reintento, en segundos; después crece (10.16). */
  retryDelay: number;
  retryDelayMax: number;
  /** Un intento que tarda más que esto se da por fallido y se reintenta. */
  expireInSeconds: number;
}

/** Adonde van los trabajos que agotaron sus reintentos, para revisarlos. */
export const DEAD_LETTER_QUEUE = "dead-letter";

export const QUEUES = {
  /** Borra sesiones vencidas y enlaces de un solo uso ya vencidos (diario). */
  authCleanup: {
    name: "maintenance.auth-cleanup",
    retryLimit: 3,
    retryDelay: 60,
    retryDelayMax: 3600,
    expireInSeconds: 300,
  },
  /** DC-02: aviso a Dirección cuando se abre una ficha de emergencia. */
  notifyEmergencyViewed: {
    name: "notify.emergency-viewed",
    retryLimit: 5,
    retryDelay: 10,
    retryDelayMax: 600,
    expireInSeconds: 60,
  },
  /** 7.3-C3: aviso a Administración y Dirección de una solicitud de ingreso nueva. */
  notifyAdmissionRequest: {
    name: "notify.admission-request",
    retryLimit: 5,
    retryDelay: 10,
    retryDelayMax: 600,
    expireInSeconds: 60,
  },
  /** DC-16: acuse genérico a la familia que dejó un email en el formulario público. */
  emailAdmissionRequestReceipt: {
    name: "email.admission-request-receipt",
    retryLimit: 5,
    retryDelay: 60,
    retryDelayMax: 3600,
    expireInSeconds: 120,
  },
  /** DC-14: borra las solicitudes no convertidas a los 12 meses (diario). */
  purgeAdmissionRequests: {
    name: "maintenance.purge-admission-requests",
    retryLimit: 3,
    retryDelay: 60,
    retryDelayMax: 3600,
    expireInSeconds: 300,
  },
} as const satisfies Record<string, QueueDefinition>;

/**
 * Colas que ya no se usan (el abono se quitó: docs/decisions/0024). El
 * worker las borra al arrancar, con sus trabajos y sus programaciones.
 */
export const RETIRED_QUEUES = ["fees.daily", "email.fee-digest"] as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES]["name"];

/** Datos de un trabajo que nace de un evento de dominio (worker/relay.ts). */
export interface DomainEventJobData {
  eventId: string;
  organizationId: string;
  siteId: string | null;
  type: string;
  entityType: string;
  entityId: string | null;
  /** Identificadores y contadores; nunca datos personales (sección 11.1). */
  payload: Record<string, unknown>;
  occurredAt: string;
}

/**
 * Qué colas reciben cada tipo de evento. Un evento sin suscriptores igual
 * se marca como procesado. Cada módulo de la Etapa 3 suma los suyos.
 */
export const EVENT_SUBSCRIPTIONS: Readonly<Record<string, readonly QueueName[]>> = {
  "emergency.viewed": [QUEUES.notifyEmergencyViewed.name],
  "admission_request.created": [
    QUEUES.notifyAdmissionRequest.name,
    QUEUES.emailAdmissionRequestReceipt.name,
  ],
};
