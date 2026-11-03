import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  effectivePermissions,
  PERMISSION_KEYS,
  PERMISSIONS,
  rolePermissionPairs,
} from "@/lib/auth/permissions";

// La matriz está en la migración original y en las que suman permisos.
const migration = [
  "0005_permissions_matrix.sql",
  "0035_care_grants.sql",
  "0037_attendance_grants.sql",
]
  .map((file) => readFileSync(path.resolve(__dirname, "../../db/migrations", file), "utf8"))
  .join("\n");

function permissionsOfRole(role: string) {
  return rolePermissionPairs()
    .filter((pair) => pair.role === role)
    .map((pair) => pair.permission)
    .sort();
}

describe("matriz de permisos (F.3, DC-01)", () => {
  it("la migración tiene el mismo catálogo que el código", () => {
    const catalog = [...migration.matchAll(/\('([a-z_.]+)', '([a-z_]+)', '[^']+'\)/g)].map(
      ([, key, module]) => `${key}:${module}`,
    );
    const expected = PERMISSION_KEYS.map((key) => `${key}:${PERMISSIONS[key].module}`);
    expect(catalog.sort()).toEqual(expected.sort());
  });

  it("la migración tiene los mismos pares (permiso, rol) que el código", () => {
    const pairs = [
      ...migration.matchAll(/\('([a-z_.]+)', '(admin|direccion|enfermeria|cuidado)'\)/g),
    ].map(([, permission, role]) => `${permission}:${role}`);
    const expected = rolePermissionPairs().map((pair) => `${pair.permission}:${pair.role}`);
    expect(pairs.sort()).toEqual(expected.sort());
    expect(expected).toHaveLength(83);
  });

  it("Administración gestiona usuarios y configuración, pero no entrega turnos", () => {
    const admin = permissionsOfRole("admin");
    expect(admin).toContain("users.manage");
    expect(admin).toContain("settings.manage");
    expect(admin).not.toContain("handover.deliver");
    expect(admin).toContain("care.record");
    expect(admin).toHaveLength(27);
  });

  it("Dirección hace todo menos usuarios y configuración (nota 2)", () => {
    const direccion = permissionsOfRole("direccion");
    expect(direccion).not.toContain("users.manage");
    expect(direccion).not.toContain("settings.manage");
    expect(direccion).toContain("residents.update");
    expect(direccion).toContain("handover.deliver");
    expect(direccion).toContain("care.manage");
    expect(direccion).toHaveLength(27);
  });

  it("Enfermería edita datos y contactos, sin montos ni fotos del legajo (nota 1)", () => {
    const enfermeria = permissionsOfRole("enfermeria");
    expect(enfermeria).toContain("residents.update");
    expect(enfermeria).toContain("contacts.manage");
    expect(enfermeria).not.toContain("fees.read");
    expect(enfermeria).not.toContain("documents.files");
    expect(enfermeria).not.toContain("audit.read_all");
    expect(enfermeria).toContain("care.record");
    expect(enfermeria).not.toContain("care.manage");
    expect(enfermeria).toHaveLength(17);
  });

  it("Cuidado ve fichas y emergencias, registra novedades, turnos y emergencias, sin atenciones", () => {
    const cuidado = permissionsOfRole("cuidado");
    expect(cuidado).toEqual(
      [
        "attendance.record",
        "audit.read_resident",
        "emergency.pdf",
        "emergency.view",
        "emergencies.manage",
        "handover.confirm",
        "handover.deliver",
        "notes.create",
        "notes.edit_own",
        "notes.resolve",
        "residents.read",
        "staff.read",
      ].sort(),
    );
  });
});

describe("effectivePermissions (módulos activables, E3)", () => {
  it("descarta los permisos de módulos apagados y las claves desconocidas", () => {
    const granted = ["residents.read", "fees.read", "permiso.inventado"];
    expect([...effectivePermissions(granted, ["core"])]).toEqual(["residents.read"]);
    expect([...effectivePermissions(granted, ["core", "fees"])].sort()).toEqual([
      "fees.read",
      "residents.read",
    ]);
    expect(effectivePermissions(granted, []).size).toBe(0);
  });
});
