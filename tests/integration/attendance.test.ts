import { randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import * as schema from "@/db/schema";
import { attendanceBoard, presentNow, recentRecords } from "@/features/attendance/queries";
import {
  isValidAttendanceToken,
  recordAttendance,
  rotateAttendanceToken,
} from "@/features/attendance/service";
import { createDb, createPool } from "@/lib/db/client";
import { withTenant, type TenantContext } from "@/lib/db/tenant";
import { DomainError } from "@/lib/errors";
import { createOrganization } from "@/lib/organizations/create";

// Asistencia del personal con QR (docs/decisions/0020). Datos ficticios.

const { ownerUrl, appUrl } = inject("databaseUrls");
const ownerPool = createPool(ownerUrl, { application_name: "pruebas-asistencia-dueno" });
const appPool = createPool(appUrl, { application_name: "pruebas-asistencia-app" });
const owner = createDb(ownerPool);
const app = createDb(appPool);

type RoleKey = "admin" | "direccion" | "enfermeria" | "cuidado";

async function member(organizationId: string, name: string, role: RoleKey): Promise<string> {
  const [user] = await owner
    .insert(schema.users)
    .values({ name, email: `${randomUUID()}@prueba.test` })
    .returning({ id: schema.users.id });
  const [roleRow] = await owner
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .where(and(eq(schema.roles.key, role), isNull(schema.roles.organizationId)));
  await owner
    .insert(schema.organizationMemberships)
    .values({ organizationId, userId: user!.id, roleId: roleRow!.id });
  return user!.id;
}

let siteId = "";
let token = "";
let carer: TenantContext;
let nurse: TenantContext;
let director: TenantContext;
let admin: TenantContext;

beforeAll(async () => {
  const created = await owner.transaction((tx) =>
    createOrganization(tx, {
      organizationName: "Residencia de asistencia",
      siteName: "Sede central",
      adminEmail: `admin-${randomUUID()}@prueba.test`,
      adminName: "Administración",
    }),
  );
  const organizationId = created.organizationId;
  siteId = created.siteId;
  carer = { organizationId, userId: await member(organizationId, "Marta Gómez", "cuidado") };
  nurse = { organizationId, userId: await member(organizationId, "Jorge Suárez", "enfermeria") };
  director = { organizationId, userId: await member(organizationId, "Elena Ruiz", "direccion") };
  admin = { organizationId, userId: await member(organizationId, "Laura Pereyra", "admin") };
  const [site] = await owner
    .select({ token: schema.sites.attendanceToken })
    .from(schema.sites)
    .where(eq(schema.sites.id, siteId));
  token = site!.token;
});

afterAll(async () => {
  await appPool.end();
  await ownerPool.end();
});

describe("asistencia con QR", () => {
  it("cada sede nace con un código de 64 caracteres", () => {
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("registra la entrada y, después, la salida, con la hora del servidor", async () => {
    const t0 = new Date();
    const entry = await withTenant(app, carer, (tx) =>
      recordAttendance(tx, carer, { siteId, token }, t0),
    );
    expect(entry.kind).toBe("in");

    // Un doble toque enseguida no registra la salida.
    const again = await withTenant(app, carer, (tx) =>
      recordAttendance(tx, carer, { siteId, token }, new Date(t0.getTime() + 30_000)),
    );
    expect(again.kind).toBe("in");
    const afterTap = await withTenant(app, carer, (tx) =>
      recentRecords(tx, { siteId, userId: carer.userId, limit: 5 }),
    );
    expect(afterTap).toHaveLength(1);

    const present = await withTenant(app, admin, (tx) => presentNow(tx, siteId));
    expect(present.map((row) => row.name)).toContain("Marta Gómez");

    const exit = await withTenant(app, carer, (tx) =>
      recordAttendance(tx, carer, { siteId, token }, new Date(t0.getTime() + 3 * 60_000)),
    );
    expect(exit.kind).toBe("out");
    const presentAfter = await withTenant(app, admin, (tx) => presentNow(tx, siteId));
    expect(presentAfter.map((row) => row.name)).not.toContain("Marta Gómez");

    const audit = await owner
      .select({ action: schema.auditEvents.action })
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.actorUserId, carer.userId));
    expect(audit.map((row) => row.action).sort()).toEqual(["attendance.in", "attendance.out"]);
  });

  it("un código equivocado no registra nada", async () => {
    await expect(
      withTenant(app, nurse, (tx) =>
        recordAttendance(tx, nurse, { siteId, token: "0".repeat(64) }),
      ),
    ).rejects.toBeInstanceOf(DomainError);
    await expect(
      withTenant(app, nurse, (tx) => recordAttendance(tx, nurse, { siteId, token: "nada" })),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("nadie registra ni ve la asistencia de otra persona sin permiso", async () => {
    await withTenant(app, nurse, (tx) => recordAttendance(tx, nurse, { siteId, token }));
    // RLS: insertar a nombre de otra persona falla.
    await expect(
      withTenant(app, carer, (tx) =>
        tx.insert(schema.attendanceRecords).values({
          organizationId: carer.organizationId,
          siteId,
          userId: nurse.userId,
          kind: "in",
        }),
      ),
    ).rejects.toThrow();
    // Cuidado y Dirección ven solo lo suyo; Administración, a todos.
    const seenByCarer = await withTenant(app, carer, (tx) =>
      tx.select({ userId: schema.attendanceRecords.userId }).from(schema.attendanceRecords),
    );
    expect(new Set(seenByCarer.map((row) => row.userId))).toEqual(new Set([carer.userId]));
    const seenByDirector = await withTenant(app, admin, (tx) => presentNow(tx, siteId));
    expect(seenByDirector.map((row) => row.name)).toContain("Jorge Suárez");
    const onlyOwn = await withTenant(app, director, (tx) =>
      tx.select({ userId: schema.attendanceRecords.userId }).from(schema.attendanceRecords),
    );
    expect(onlyOwn.every((row) => row.userId === director.userId)).toBe(true);
    const board = await withTenant(app, admin, (tx) => attendanceBoard(tx, siteId));
    expect(board.find((row) => row.name === "Jorge Suárez")?.last?.kind).toBe("in");
    expect(board.find((row) => row.name === "Laura Pereyra")?.last).toBeNull();
    // No se corrige ni se borra.
    await expect(
      withTenant(app, nurse, (tx) =>
        tx
          .update(schema.attendanceRecords)
          .set({ kind: "out" })
          .where(eq(schema.attendanceRecords.userId, nurse.userId)),
      ),
    ).rejects.toThrow();
  });

  it("cambiar el código deja sin efecto el QR impreso", async () => {
    await withTenant(app, admin, (tx) => rotateAttendanceToken(tx, admin, siteId));
    expect(await withTenant(app, admin, (tx) => isValidAttendanceToken(tx, siteId, token))).toBe(
      false,
    );
    await expect(
      withTenant(app, director, (tx) => recordAttendance(tx, director, { siteId, token })),
    ).rejects.toBeInstanceOf(DomainError);
    const [site] = await owner
      .select({ token: schema.sites.attendanceToken })
      .from(schema.sites)
      .where(eq(schema.sites.id, siteId));
    expect(site!.token).toMatch(/^[0-9a-f]{64}$/);
    expect(site!.token).not.toBe(token);
  });
});
