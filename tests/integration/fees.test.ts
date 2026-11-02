import { randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import * as schema from "@/db/schema";
import { runDailyFees } from "@/features/fees/daily";
import { getResidentFees, listMonthCharges } from "@/features/fees/queries";
import { feeSetupSchema, paymentSchema } from "@/features/fees/schemas";
import {
  changePrice,
  ensureCharges,
  registerPayment,
  setupFeePlan,
  voidChargesAfterDischarge,
  voidPayment,
} from "@/features/fees/service";
import { residentDataSchema } from "@/features/residents/schemas";
import { startAdmission } from "@/features/residents/service";
import { createDb, createPool } from "@/lib/db/client";
import { withSystemTenant, withTenant, type TenantContext } from "@/lib/db/tenant";
import { DomainError } from "@/lib/errors";
import { createOrganization } from "@/lib/organizations/create";

// Etapa 3.8: abono mensual y pagos (7.3-C4, 12.10, DC-20 a DC-23). Datos ficticios.

const { ownerUrl, appUrl } = inject("databaseUrls");
const ownerPool = createPool(ownerUrl, { application_name: "pruebas-abono-dueno" });
const appPool = createPool(appUrl, { application_name: "pruebas-abono-app" });
const owner = createDb(ownerPool);
const app = createDb(appPool);

let siteId: string;
let direccion: TenantContext;
let cuidado: TenantContext;
let otherOrg: TenantContext;
let cash: string;

async function member(organizationId: string, name: string, roleKey: string): Promise<string> {
  const [user] = await owner
    .insert(schema.users)
    .values({ name, email: `${randomUUID()}@prueba.test` })
    .returning({ id: schema.users.id });
  const [role] = await owner
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .where(and(eq(schema.roles.key, roleKey), isNull(schema.roles.organizationId)));
  await owner
    .insert(schema.organizationMemberships)
    .values({ organizationId, userId: user!.id, roleId: role!.id });
  return user!.id;
}

async function newOrg(name: string) {
  return owner.transaction((tx) =>
    createOrganization(tx, {
      organizationName: name,
      siteName: "Sede central",
      adminEmail: `admin-${randomUUID()}@prueba.test`,
      adminName: "Administración",
    }),
  );
}

/** Un paciente activo que ingresó el 14/10/2026. */
async function activeResident(lastName: string): Promise<string> {
  const { residentId } = await withTenant(app, direccion, (tx) =>
    startAdmission(
      tx,
      direccion,
      siteId,
      residentDataSchema.parse({
        firstName: "Elena",
        lastName,
        admissionDate: "2026-10-14",
        admissionModality: "private",
        coverageType: "none",
      }),
    ),
  );
  await owner
    .update(schema.residents)
    .set({ status: "active" })
    .where(eq(schema.residents.id, residentId));
  return residentId;
}

const inA = <T>(fn: Parameters<typeof withTenant<T>>[2]) => withTenant(app, direccion, fn);

function setup(residentId: string, fields: Record<string, string>) {
  return inA((tx) =>
    setupFeePlan(
      tx,
      direccion,
      { id: residentId, siteId, admissionDate: "2026-10-14" },
      feeSetupSchema.parse(fields),
      "2026-10-14",
    ),
  );
}

function pay(chargeId: string, amount: string, clientRequestId = randomUUID()) {
  return inA((tx) =>
    registerPayment(
      tx,
      direccion,
      chargeId,
      {
        ...paymentSchema.parse({ amount, paidOn: "2026-11-02", methodId: cash }),
        clientRequestId,
      },
      "2026-11-02",
    ),
  );
}

beforeAll(async () => {
  const created = await newOrg("Residencia (abono)");
  siteId = created.siteId;
  direccion = {
    organizationId: created.organizationId,
    userId: await member(created.organizationId, "Sofía Medina", "direccion"),
  };
  cuidado = {
    organizationId: created.organizationId,
    userId: await member(created.organizationId, "Marta Gómez", "cuidado"),
  };
  const other = await newOrg("Otra residencia (abono)");
  otherOrg = {
    organizationId: other.organizationId,
    userId: await member(other.organizationId, "Ana Paz", "direccion"),
  };
  const [method] = await owner
    .select({ id: schema.paymentMethods.id })
    .from(schema.paymentMethods)
    .where(
      and(eq(schema.paymentMethods.siteId, siteId), eq(schema.paymentMethods.name, "Efectivo")),
    );
  cash = method!.id;
});

afterAll(async () => {
  await Promise.all([ownerPool.end(), appPool.end()]);
});

describe("Abono mensual", () => {
  it("al ingresar: primer mes cobrado y la próxima cuota vence el 14/11", async () => {
    const residentId = await activeResident("Ramírez");
    await setup(residentId, {
      feeAmount: "450.000",
      firstDueDate: "2026-11-14",
      firstMonthPaid: "on",
      firstPaymentMethodId: cash,
    });
    expect(await inA((tx) => ensureCharges(tx, residentId, "2026-12-01"))).toBe(1);
    // Repetirla no duplica.
    expect(await inA((tx) => ensureCharges(tx, residentId, "2026-12-01"))).toBe(0);
    const fees = await inA((tx) => getResidentFees(tx, residentId, "2026-11-02"));
    expect(fees.current).toMatchObject({ amount: "450000.00", billingDay: 14 });
    expect(fees.charges.map((charge) => [charge.dueDate, charge.status, charge.balance])).toEqual([
      ["2026-11-14", "pending", "450000.00"],
      ["2026-10-14", "paid", "0.00"],
    ]);
    expect(fees.nextDue?.dueDate).toBe("2026-11-14");
  });

  it("pagos parciales con saldo; no se pasa del saldo; el mismo envío no paga dos veces", async () => {
    const residentId = await activeResident("Benítez");
    await setup(residentId, { feeAmount: "300000", firstDueDate: "2026-11-14" });
    await inA((tx) => ensureCharges(tx, residentId, "2026-12-01"));
    const [charge] = (await inA((tx) => getResidentFees(tx, residentId, "2026-11-02"))).charges;
    const key = randomUUID();
    await pay(charge!.id, "100.000", key);
    await pay(charge!.id, "100.000", key);
    let fees = await inA((tx) => getResidentFees(tx, residentId, "2026-11-02"));
    expect(fees.charges[0]).toMatchObject({ status: "pending", balance: "200000.00" });
    await expect(pay(charge!.id, "250.000")).rejects.toThrow(/supera el saldo/);
    await pay(charge!.id, "200.000");
    fees = await inA((tx) => getResidentFees(tx, residentId, "2026-11-02"));
    expect(fees.charges[0]).toMatchObject({ status: "paid", balance: "0.00" });

    // Un pago anulado no se borra y la cuota vuelve a tener saldo.
    const last = fees.payments.at(-1)!;
    await inA((tx) => voidPayment(tx, direccion, last.id, "Se cargó dos veces"));
    fees = await inA((tx) => getResidentFees(tx, residentId, "2026-11-02"));
    expect(fees.charges[0]).toMatchObject({ status: "pending", balance: "200000.00" });
    expect(fees.payments).toHaveLength(2);
    expect(fees.payments.at(-1)?.voidReason).toBe("Se cargó dos veces");
  });

  it("cambiar el precio guarda el anterior y aplica desde la próxima cuota sin pagos", async () => {
    const residentId = await activeResident("Ojeda");
    await setup(residentId, { feeAmount: "300000", firstDueDate: "2026-11-14" });
    await inA((tx) => ensureCharges(tx, residentId, "2026-12-20"));
    let fees = await inA((tx) => getResidentFees(tx, residentId, "2026-11-02"));
    const november = fees.charges.find((charge) => charge.dueDate === "2026-11-14")!;
    await pay(november.id, "50.000");
    await inA((tx) =>
      changePrice(
        tx,
        direccion,
        residentId,
        { amount: "320000.00", reason: "Aumento anual" },
        "2026-11-02",
      ),
    );
    fees = await inA((tx) => getResidentFees(tx, residentId, "2026-11-02"));
    expect(fees.plans.map((plan) => [plan.amount, plan.effectiveTo, plan.reason])).toEqual([
      ["320000.00", null, "Aumento anual"],
      ["300000.00", "2026-11-02", "Ingreso"],
    ]);
    const amounts = Object.fromEntries(
      fees.charges.map((charge) => [charge.dueDate, charge.amount]),
    );
    // Noviembre ya tenía un pago: queda como estaba. Diciembre pasa al precio nuevo.
    expect(amounts).toEqual({ "2026-11-14": "300000.00", "2026-12-14": "320000.00" });
  });

  it("monto 0: sin cuotas ni avisos (DC-22)", async () => {
    const residentId = await activeResident("Paz");
    await setup(residentId, { feeAmount: "0", firstDueDate: "2026-11-14" });
    expect(await inA((tx) => ensureCharges(tx, residentId, "2027-01-01"))).toBe(0);
  });

  it("con el egreso se anulan las cuotas futuras sin pagos y no se generan más", async () => {
    const residentId = await activeResident("Suárez");
    await setup(residentId, { feeAmount: "300000", firstDueDate: "2026-11-14" });
    await inA((tx) => ensureCharges(tx, residentId, "2026-12-20"));
    await owner
      .update(schema.residents)
      .set({ status: "discharged", dischargeDate: "2026-11-20", dischargeReason: "traslado" })
      .where(eq(schema.residents.id, residentId));
    expect(await inA((tx) => voidChargesAfterDischarge(tx, residentId, "2026-11-20"))).toBe(1);
    expect(await inA((tx) => ensureCharges(tx, residentId, "2027-02-01"))).toBe(0);
    const fees = await inA((tx) => getResidentFees(tx, residentId, "2026-11-25"));
    expect(fees.charges.map((charge) => [charge.dueDate, charge.status])).toEqual([
      ["2026-12-14", "void"],
      ["2026-11-14", "overdue"],
    ]);
  });

  it("aviso 7 días antes a Administración y Dirección, una sola vez", async () => {
    const residentId = await activeResident("Medina");
    await setup(residentId, { feeAmount: "280000", firstDueDate: "2026-11-09" });
    // 02/11 a las 08:00 en Buenos Aires: la cuota del 09/11 entra en el aviso.
    const now = new Date("2026-11-02T11:00:00Z");
    const first = await withSystemTenant(app, direccion.organizationId, (tx) =>
      runDailyFees(tx, direccion.organizationId, now),
    );
    expect(first.chargesCreated).toBeGreaterThanOrEqual(1);
    expect(first.newReminders.get(direccion.userId)?.count).toBeGreaterThanOrEqual(1);
    expect(first.newReminders.has(cuidado.userId)).toBe(false);
    const retry = await withSystemTenant(app, direccion.organizationId, (tx) =>
      runDailyFees(tx, direccion.organizationId, now),
    );
    expect(retry.newReminders.size).toBe(0);
    const month = await inA((tx) => listMonthCharges(tx, siteId, "2026-11", "2026-11-02"));
    expect(
      month.items.some((item) => item.lastName === "Medina" && item.dueDate === "2026-11-09"),
    ).toBe(true);
  });

  it("Cuidado no ve montos ni registra pagos, aunque la app se equivocara (12.10)", async () => {
    const asCuidado = await withTenant(app, cuidado, async (tx) => ({
      plans: await tx.select().from(schema.residentFeePlans),
      charges: await tx.select().from(schema.feeCharges),
      payments: await tx.select().from(schema.feePayments),
    }));
    expect(asCuidado).toEqual({ plans: [], charges: [], payments: [] });
    const [anyCharge] = await owner
      .select({ id: schema.feeCharges.id, residentId: schema.feeCharges.residentId })
      .from(schema.feeCharges)
      .where(eq(schema.feeCharges.organizationId, cuidado.organizationId))
      .limit(1);
    const error = await withTenant(app, cuidado, (tx) =>
      tx.insert(schema.feePayments).values({
        organizationId: cuidado.organizationId,
        chargeId: anyCharge!.id,
        residentId: anyCharge!.residentId,
        amount: "1.00",
        paidOn: "2026-11-02",
        methodId: cash,
        receivedBy: cuidado.userId,
        clientRequestId: randomUUID(),
      }),
    ).then(
      () => "sin error",
      (caught: { cause?: { code?: string } }) => caught.cause?.code,
    );
    expect(error).toBe("42501");
  });

  it("otra residencia no ve los abonos; la app no borra pagos", async () => {
    const other = await withTenant(app, otherOrg, (tx) => tx.select().from(schema.feeCharges));
    expect(other).toEqual([]);
    const code = await inA((tx) => tx.delete(schema.feePayments)).then(
      () => "sin error",
      (caught: { cause?: { code?: string } }) => caught.cause?.code,
    );
    expect(code).toBe("42501");
  });

  it("valida el próximo vencimiento y que no haya dos abonos", async () => {
    const residentId = await activeResident("López");
    await expect(
      setup(residentId, { feeAmount: "1000", firstDueDate: "2026-10-01" }),
    ).rejects.toBeInstanceOf(DomainError);
    await setup(residentId, { feeAmount: "1000", firstDueDate: "2026-11-14" });
    await expect(
      setup(residentId, { feeAmount: "1000", firstDueDate: "2026-11-14" }),
    ).rejects.toThrow(/ya tiene un abono/);
  });
});
