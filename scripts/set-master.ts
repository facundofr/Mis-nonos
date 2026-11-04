/*
 * Deja a una persona como usuario Master de su residencia (docs/decisions/0021).
 * Corre con el rol dueño (DATABASE_URL_OWNER), que no está sujeto a RLS.
 *
 * Uso (los datos van por variables de entorno, nunca en un archivo):
 *   MASTER_EMAIL=persona@ejemplo.com [MASTER_PASSWORD=...] [MASTER_ORGANIZATION_ID=uuid] \
 *     corepack pnpm user:master
 *
 * - La persona tiene que tener cuenta y pertenecer a la residencia.
 * - Si hay otro Master en la residencia, no hace nada: hay uno solo.
 * - Con MASTER_PASSWORD, le pone esa contraseña y cierra sus sesiones.
 * - Queda en el registro de cambios ("Pasó a ser el usuario Master").
 * Nunca muestra la contraseña ni el email en la salida.
 */
import { hashPassword } from "better-auth/crypto";
import { and, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";

import * as schema from "@/db/schema";
import { diffChanges, recordAudit } from "@/lib/audit";
import { AUTH_POLICY } from "@/lib/auth/policy";
import { createDb, createPool } from "@/lib/db/client";

const inputSchema = z.object({
  email: z.email(),
  password: z
    .string()
    .min(AUTH_POLICY.passwordMinLength)
    .max(AUTH_POLICY.passwordMaxLength)
    .optional(),
  organizationId: z.uuid().optional(),
});

async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // En producción las variables vienen del entorno.
  }
  const parsed = inputSchema.safeParse({
    email: process.env.MASTER_EMAIL?.trim().toLowerCase(),
    password: process.env.MASTER_PASSWORD || undefined,
    organizationId: process.env.MASTER_ORGANIZATION_ID || undefined,
  });
  if (!parsed.success) {
    console.error(
      `Uso: MASTER_EMAIL=... [MASTER_PASSWORD=(${AUTH_POLICY.passwordMinLength} caracteres o más)] [MASTER_ORGANIZATION_ID=...] corepack pnpm user:master`,
    );
    process.exitCode = 1;
    return;
  }
  const input = parsed.data;
  const ownerUrl = process.env.DATABASE_URL_OWNER;
  if (!ownerUrl) {
    console.error("Falta la variable DATABASE_URL_OWNER (rol dueño de la base).");
    process.exitCode = 1;
    return;
  }

  const pool = createPool(ownerUrl, { max: 1, application_name: "residencia360-master" });
  const db = createDb(pool);
  try {
    const message = await db.transaction(async (tx) => {
      const [user] = await tx
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, input.email));
      if (!user) throw new Error("No hay ninguna cuenta con ese email.");

      const memberships = await tx
        .select({
          id: schema.organizationMemberships.id,
          organizationId: schema.organizationMemberships.organizationId,
          roleKey: schema.roles.key,
          status: schema.organizationMemberships.status,
        })
        .from(schema.organizationMemberships)
        .innerJoin(schema.roles, eq(schema.roles.id, schema.organizationMemberships.roleId))
        .where(eq(schema.organizationMemberships.userId, user.id));
      const candidates = input.organizationId
        ? memberships.filter((row) => row.organizationId === input.organizationId)
        : memberships;
      if (candidates.length !== 1) {
        throw new Error(
          candidates.length === 0
            ? "Esa cuenta no pertenece a la residencia."
            : "Esa cuenta está en varias residencias: indicá MASTER_ORGANIZATION_ID.",
        );
      }
      const membership = candidates[0]!;

      const [masterRole] = await tx
        .select({ id: schema.roles.id })
        .from(schema.roles)
        .where(and(eq(schema.roles.key, "master"), isNull(schema.roles.organizationId)));
      if (!masterRole) throw new Error('Falta el rol "master": aplicá las migraciones.');

      const [otherMaster] = await tx
        .select({ id: schema.organizationMemberships.id })
        .from(schema.organizationMemberships)
        .where(
          and(
            eq(schema.organizationMemberships.organizationId, membership.organizationId),
            eq(schema.organizationMemberships.roleId, masterRole.id),
            ne(schema.organizationMemberships.id, membership.id),
          ),
        );
      if (otherMaster) throw new Error("La residencia ya tiene otro usuario Master.");

      const changed = membership.roleKey !== "master" || membership.status !== "active";
      if (changed) {
        await tx
          .update(schema.organizationMemberships)
          .set({ roleId: masterRole.id, status: "active", updatedAt: new Date() })
          .where(eq(schema.organizationMemberships.id, membership.id));
        await recordAudit(
          tx,
          { organizationId: membership.organizationId, userId: null },
          {
            action: "user.master_assigned",
            entityType: "membership",
            entityId: membership.id,
            changes: diffChanges({ roleKey: membership.roleKey }, { roleKey: "master" }),
          },
        );
      }

      if (input.password) {
        const updated = await tx
          .update(schema.accounts)
          .set({ password: await hashPassword(input.password) })
          .where(
            and(eq(schema.accounts.userId, user.id), eq(schema.accounts.providerId, "credential")),
          )
          .returning({ id: schema.accounts.id });
        if (updated.length !== 1) throw new Error("La cuenta no tiene contraseña para cambiar.");
        await tx
          .update(schema.users)
          .set({ passwordChangeRequired: false })
          .where(eq(schema.users.id, user.id));
        await tx.delete(schema.sessions).where(eq(schema.sessions.userId, user.id));
        await recordAudit(
          tx,
          { organizationId: membership.organizationId, userId: null },
          { action: "user.password_reset", entityType: "membership", entityId: membership.id },
        );
      }

      return [
        changed ? "La cuenta quedó como usuario Master." : "La cuenta ya era el usuario Master.",
        input.password ? "Contraseña actualizada; las sesiones abiertas se cerraron." : "",
      ]
        .filter(Boolean)
        .join(" ");
    });
    console.log(message);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "No se pudo completar.");
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
