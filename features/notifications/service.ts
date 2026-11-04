import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";

import * as schema from "@/db/schema";
import type { Transaction } from "@/lib/db/client";

import { activeMembersWithRoles } from "../emergency/queries";

/*
 * Notificaciones dentro de la app (10.6, F1-NOT-01). Sin datos de salud en
 * el texto: dicen qué pasó y llevan a la pantalla, donde rigen los permisos.
 */

export interface NewNotification {
  recipientUserId: string;
  type: string;
  entityType?: string | null;
  entityId?: string | null;
  title: string;
  body?: string | null;
  link?: string | null;
  dedupeKey: string;
}

/** Crea notificaciones; las repetidas (misma clave) se ignoran. Devuelve cuántas creó. */
export async function createNotifications(
  tx: Transaction,
  organizationId: string,
  items: NewNotification[],
): Promise<number> {
  if (items.length === 0) return 0;
  // Sin RETURNING: devolver las filas exigiría la política de lectura, que
  // solo deja ver las notificaciones propias (el worker no actúa como nadie).
  const result = await tx
    .insert(schema.notifications)
    .values(items.map((item) => ({ organizationId, ...item })))
    .onConflictDoNothing({ target: schema.notifications.dedupeKey });
  return result.rowCount ?? 0;
}

/**
 * DC-02: cuando alguien abre una ficha de emergencia, Master recibe un
 * aviso en la app (salvo quien la abrió). Corre en el worker, con
 * withSystemTenant.
 */
export async function notifyEmergencyViewed(
  tx: Transaction,
  event: {
    eventId: string;
    organizationId: string;
    residentId: string;
    viewerUserId: string | null;
  },
): Promise<number> {
  const [resident] = await tx
    .select({ firstName: schema.residents.firstName, lastName: schema.residents.lastName })
    .from(schema.residents)
    .where(eq(schema.residents.id, event.residentId));
  if (!resident) return 0;
  const [viewer] = event.viewerUserId
    ? await tx
        .select({ name: schema.users.name })
        .from(schema.users)
        .where(eq(schema.users.id, event.viewerUserId))
    : [];
  const recipients = (await activeMembersWithRoles(tx, event.organizationId, ["master"])).filter(
    (member) => member.userId !== event.viewerUserId,
  );
  return createNotifications(
    tx,
    event.organizationId,
    recipients.map((recipient) => ({
      recipientUserId: recipient.userId,
      type: "emergency.viewed",
      entityType: "resident",
      entityId: event.residentId,
      title: "Se abrió una ficha de emergencia",
      body: `${viewer?.name ?? "Alguien del personal"} abrió la ficha de emergencia de ${resident.firstName} ${resident.lastName}.`,
      link: `/pacientes/${event.residentId}?tab=actividad`,
      dedupeKey: `emergency.viewed:${event.eventId}:${recipient.userId}`,
    })),
  );
}

/**
 * 7.3-C3: una solicitud de ingreso nueva avisa a Administración y
 * Master (salvo a quien la cargó). Sin datos del futuro paciente.
 */
export async function notifyAdmissionRequestCreated(
  tx: Transaction,
  event: { eventId: string; organizationId: string; requestId: string; createdBy: string | null },
): Promise<number> {
  const [request] = await tx
    .select({ origin: schema.admissionRequests.origin })
    .from(schema.admissionRequests)
    .where(eq(schema.admissionRequests.id, event.requestId));
  if (!request) return 0;
  const recipients = (
    await activeMembersWithRoles(tx, event.organizationId, ["admin", "master"])
  ).filter((member) => member.userId !== event.createdBy);
  return createNotifications(
    tx,
    event.organizationId,
    recipients.map((recipient) => ({
      recipientUserId: recipient.userId,
      type: "admission_request.created",
      entityType: "admission_request",
      entityId: event.requestId,
      title: "Nueva solicitud de ingreso",
      body:
        request.origin === "landing"
          ? "Una familia completó el formulario de la web."
          : "Se cargó una solicitud en la bandeja.",
      link: `/solicitudes/${event.requestId}`,
      dedupeKey: `admission_request.created:${event.eventId}:${recipient.userId}`,
    })),
  );
}

// --- Lecturas de la persona (dentro de withTenant, RLS: solo las propias) ---

export async function countUnread(tx: Transaction, userId: string): Promise<number> {
  const [row] = await tx
    .select({ value: count() })
    .from(schema.notifications)
    .where(
      and(eq(schema.notifications.recipientUserId, userId), isNull(schema.notifications.readAt)),
    );
  return row?.value ?? 0;
}

export function listNotifications(tx: Transaction, userId: string, limit = 50) {
  return tx
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.recipientUserId, userId))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(limit);
}

export async function markRead(tx: Transaction, userId: string, ids?: string[]): Promise<void> {
  await tx
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(schema.notifications.recipientUserId, userId),
        isNull(schema.notifications.readAt),
        ids ? inArray(schema.notifications.id, ids) : undefined,
      ),
    );
}
