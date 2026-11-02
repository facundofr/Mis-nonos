import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { appRole, createdAt, primaryId, tenantPolicies, updatedAt } from "./_shared";
import { users } from "./auth";
import { residents } from "./residents";
import { organizations, sites } from "./tenancy";

/*
 * Abono mensual y pagos (7.3-C4, 11.2, 12.10, DC-20 a DC-24). Montos en
 * pesos con numeric(12,2). Nada se borra: un cambio de precio cierra el
 * plan vigente y abre otro; un pago se anula con motivo.
 *
 * Solo Administración y Dirección ven montos (12.10). Además de can() en la
 * app, la base lo exige en sus políticas: lectura con fees.read, escritura
 * con fees.manage. El worker (sin persona) puede leer y generar cuotas.
 */

const organizationId = () =>
  uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "restrict" });

const money = (name: string) => numeric(name, { precision: 12, scale: 2, mode: "string" });

const inOrg = sql`organization_id = (select app.current_org_id())`;
const systemOr = (permission: string) =>
  sql`((select app.current_user_id()) is null or (select app.current_user_can(${sql.raw(`'${permission}'`)})))`;

/** Políticas del abono: misma residencia y el permiso del módulo. */
function feePolicies(table: string) {
  return [
    pgPolicy(`${table}_select`, {
      for: "select",
      to: appRole,
      using: sql`${inOrg} and ${systemOr("fees.read")}`,
    }),
    pgPolicy(`${table}_insert`, {
      for: "insert",
      to: appRole,
      withCheck: sql`${inOrg} and ${systemOr("fees.manage")}`,
    }),
    pgPolicy(`${table}_update`, {
      for: "update",
      to: appRole,
      using: sql`${inOrg} and ${systemOr("fees.manage")}`,
      withCheck: sql`${inOrg} and ${systemOr("fees.manage")}`,
    }),
  ];
}

/** Medios de pago, configurables por sede (DC-21). Valores iniciales: efectivo, transferencia, otro. */
export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: primaryId(),
    organizationId: organizationId(),
    siteId: uuid("site_id").notNull(),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("payment_methods_site_name_unique").on(t.siteId, t.name),
    unique("payment_methods_id_organization_unique").on(t.id, t.organizationId),
    foreignKey({
      name: "payment_methods_site_organization_fk",
      columns: [t.siteId, t.organizationId],
      foreignColumns: [sites.id, sites.organizationId],
    }).onDelete("restrict"),
    check("payment_methods_name_check", sql`length(trim(${t.name})) between 1 and 40`),
    // Es un catálogo sin montos: lo ve toda la residencia (como las categorías).
    ...tenantPolicies("payment_methods"),
  ],
);

/**
 * Precio del abono de un paciente (11.2). Hay uno vigente por paciente
 * (effective_to nulo); cambiar el precio cierra este y crea otro.
 */
export const residentFeePlans = pgTable(
  "resident_fee_plans",
  {
    id: primaryId(),
    organizationId: organizationId(),
    residentId: uuid("resident_id").notNull(),
    amount: money("amount").notNull(),
    // Día del mes en que vence; si el mes no lo tiene (29 a 31), el último día.
    billingDay: integer("billing_day").notNull(),
    // Primer vencimiento que cubre este plan (si todavía no hay cuotas).
    firstDueDate: date("first_due_date", { mode: "string" }).notNull(),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    effectiveTo: date("effective_to", { mode: "string" }),
    reason: text("reason"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("resident_fee_plans_current_unique")
      .on(t.residentId)
      .where(sql`${t.effectiveTo} is null`),
    unique("resident_fee_plans_id_organization_unique").on(t.id, t.organizationId),
    foreignKey({
      name: "resident_fee_plans_resident_organization_fk",
      columns: [t.residentId, t.organizationId],
      foreignColumns: [residents.id, residents.organizationId],
    }).onDelete("restrict"),
    check("resident_fee_plans_amount_check", sql`${t.amount} >= 0`),
    check("resident_fee_plans_day_check", sql`${t.billingDay} between 1 and 31`),
    check(
      "resident_fee_plans_dates_check",
      sql`${t.effectiveTo} is null or ${t.effectiveTo} >= ${t.effectiveFrom}`,
    ),
    ...feePolicies("resident_fee_plans"),
  ],
);

/** Cuotas (11.2): una por paciente y vencimiento. "Vencida" se calcula (pendiente y ya pasó). */
export const feeCharges = pgTable(
  "fee_charges",
  {
    id: primaryId(),
    organizationId: organizationId(),
    siteId: uuid("site_id").notNull(),
    residentId: uuid("resident_id").notNull(),
    feePlanId: uuid("fee_plan_id").notNull(),
    periodStart: date("period_start", { mode: "string" }).notNull(),
    periodEnd: date("period_end", { mode: "string" }).notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    amount: money("amount").notNull(),
    status: text("status").notNull().default("pending"),
    voidReason: text("void_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("fee_charges_resident_due_unique").on(t.residentId, t.dueDate),
    unique("fee_charges_id_organization_unique").on(t.id, t.organizationId),
    index("fee_charges_site_due_idx").on(t.siteId, t.dueDate),
    index("fee_charges_pending_idx")
      .on(t.siteId, t.dueDate)
      .where(sql`${t.status} = 'pending'`),
    foreignKey({
      name: "fee_charges_resident_organization_fk",
      columns: [t.residentId, t.organizationId],
      foreignColumns: [residents.id, residents.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "fee_charges_plan_organization_fk",
      columns: [t.feePlanId, t.organizationId],
      foreignColumns: [residentFeePlans.id, residentFeePlans.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "fee_charges_site_organization_fk",
      columns: [t.siteId, t.organizationId],
      foreignColumns: [sites.id, sites.organizationId],
    }).onDelete("restrict"),
    check("fee_charges_amount_check", sql`${t.amount} > 0`),
    check("fee_charges_status_check", sql`${t.status} in ('pending', 'paid', 'void')`),
    check("fee_charges_void_check", sql`(${t.status} = 'void') = (${t.voidReason} is not null)`),
    check("fee_charges_period_check", sql`${t.periodEnd} >= ${t.periodStart}`),
    ...feePolicies("fee_charges"),
  ],
);

/** Pagos (11.2): parciales permitidos (DC-20). No se borran: se anulan con motivo. */
export const feePayments = pgTable(
  "fee_payments",
  {
    id: primaryId(),
    organizationId: organizationId(),
    chargeId: uuid("charge_id").notNull(),
    residentId: uuid("resident_id").notNull(),
    amount: money("amount").notNull(),
    paidOn: date("paid_on", { mode: "string" }).notNull(),
    methodId: uuid("method_id").notNull(),
    notes: text("notes"),
    receivedBy: uuid("received_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    // Idempotencia: el mismo envío dos veces no registra dos pagos.
    clientRequestId: uuid("client_request_id").notNull(),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidedBy: uuid("voided_by").references(() => users.id, { onDelete: "restrict" }),
    voidReason: text("void_reason"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("fee_payments_client_request_unique").on(t.organizationId, t.clientRequestId),
    index("fee_payments_charge_idx").on(t.chargeId),
    foreignKey({
      name: "fee_payments_charge_organization_fk",
      columns: [t.chargeId, t.organizationId],
      foreignColumns: [feeCharges.id, feeCharges.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "fee_payments_resident_organization_fk",
      columns: [t.residentId, t.organizationId],
      foreignColumns: [residents.id, residents.organizationId],
    }).onDelete("restrict"),
    foreignKey({
      name: "fee_payments_method_organization_fk",
      columns: [t.methodId, t.organizationId],
      foreignColumns: [paymentMethods.id, paymentMethods.organizationId],
    }).onDelete("restrict"),
    check("fee_payments_amount_check", sql`${t.amount} > 0`),
    check(
      "fee_payments_void_check",
      sql`(${t.voidedAt} is null and ${t.voidedBy} is null and ${t.voidReason} is null)
        or (${t.voidedAt} is not null and ${t.voidedBy} is not null and length(trim(${t.voidReason})) > 0)`,
    ),
    ...feePolicies("fee_payments"),
  ],
);
