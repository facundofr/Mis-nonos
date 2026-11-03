import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { appRole, createdAt, primaryId, tenantPolicies, updatedAt } from "./_shared";
import { users } from "./auth";

/** Cliente que contrata: una residencia o un grupo (sección 11.1). */
export const organizations = pgTable(
  "organizations",
  {
    id: primaryId(),
    name: text("name").notNull(),
    status: text("status").notNull().default("active"),
    plan: text("plan"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("organizations_status_check", sql`${t.status} in ('active', 'suspended', 'closed')`),
    // Se ve la organización de la transacción y aquellas en las que el
    // usuario tiene una membresía activa (para elegir residencia al entrar).
    pgPolicy("organizations_select", {
      for: "select",
      to: appRole,
      using: sql`id = (select app.current_org_id()) or exists (
        select 1 from organization_memberships m
        where m.organization_id = organizations.id
          and m.user_id = (select app.current_user_id())
          and m.status = 'active'
      )`,
    }),
    pgPolicy("organizations_update", {
      for: "update",
      to: appRole,
      using: sql`id = (select app.current_org_id())`,
      withCheck: sql`id = (select app.current_org_id())`,
    }),
  ],
);

/**
 * Residencia física (sede). Toda tabla operativa lleva organization_id y
 * site_id desde el inicio, aunque el cliente tenga una sola sede (E2).
 */
export const sites = pgTable(
  "sites",
  {
    id: primaryId(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    address: text("address"),
    phone: text("phone"),
    timezone: text("timezone").notNull().default("America/Argentina/Buenos_Aires"),
    status: text("status").notNull().default("active"),
    // Servicio de emergencias contratado (7.3-B): aparece primero en la
    // ficha de emergencia (en Mis Nonos, Medicardio).
    emergencyServiceName: text("emergency_service_name"),
    emergencyServicePhone: text("emergency_service_phone"),
    // N.º de cliente o de afiliado de la residencia en ese servicio.
    emergencyServiceAccount: text("emergency_service_account"),
    // Reglas de la residencia como texto de referencia (7.3-B).
    medicalControlText: text("medical_control_text"),
    feeRuleText: text("fee_rule_text"),
    familyProvidesText: text("family_provides_text"),
    // La recepción del turno es opcional y se activa por sede (F.4).
    handoverRequiresConfirmation: boolean("handover_requires_confirmation")
      .notNull()
      .default(false),
    // Días antes del vencimiento del abono en que llega el aviso (7.3-C4).
    feeReminderDaysBefore: integer("fee_reminder_days_before").notNull().default(7),
    // Landing con el formulario público de solicitud (7.3-C3, 12.9): se
    // publica en /residencia/<public_slug> solo si está activada.
    publicIntakeEnabled: boolean("public_intake_enabled").notNull().default(false),
    publicSlug: text("public_slug"),
    // Presentación breve de la residencia en la landing (DC-19).
    publicIntro: text("public_intro"),
    // Código del QR de asistencia (docs/decisions/0020): va en el enlace
    // /fichar/<código>. Administración lo cambia si se filtra.
    attendanceToken: text("attendance_token")
      .notNull()
      .default(
        sql`replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')`,
      ),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("sites_organization_idx").on(t.organizationId),
    check("sites_fee_reminder_days_check", sql`${t.feeReminderDaysBefore} between 1 and 30`),
    // La dirección pública es única entre todas las residencias.
    unique("sites_public_slug_unique").on(t.publicSlug),
    check(
      "sites_public_slug_check",
      sql`${t.publicSlug} is null or (${t.publicSlug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(${t.publicSlug}) between 3 and 60)`,
    ),
    check(
      "sites_public_intake_check",
      sql`not ${t.publicIntakeEnabled} or ${t.publicSlug} is not null`,
    ),
    // Permite claves foráneas compuestas (site_id, organization_id) que
    // impiden mezclar una sede con otra organización (sección 11.4).
    unique("sites_id_organization_unique").on(t.id, t.organizationId),
    check("sites_status_check", sql`${t.status} in ('active', 'inactive')`),
    ...tenantPolicies("sites"),
  ],
);

/** Módulos activados por cliente (E3). Los activa la plataforma, no la app. */
export const organizationModules = pgTable(
  "organization_modules",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    moduleKey: text("module_key").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    enabledAt: timestamp("enabled_at", { withTimezone: true }),
    enabledBy: uuid("enabled_by").references(() => users.id, { onDelete: "restrict" }),
  },
  (t) => [
    primaryKey({ columns: [t.organizationId, t.moduleKey] }),
    check(
      "organization_modules_key_check",
      sql`${t.moduleKey} in ('core', 'care', 'medication', 'clinical_record', 'staff', 'family', 'admin', 'fees')`,
    ),
    pgPolicy("organization_modules_select", {
      for: "select",
      to: appRole,
      using: sql`organization_id = (select app.current_org_id())`,
    }),
  ],
);
