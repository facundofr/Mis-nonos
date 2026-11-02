import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  effectivePermissions,
  PERMISSION_KEYS,
  PERMISSIONS,
  rolePermissionPairs,
} from "@/lib/auth/permissions";

const migration = readFileSync(
  path.resolve(__dirname, "../../db/migrations/0005_permissions_matrix.sql"),
  "utf8",
);

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
    expect(expected).toHaveLength(65);
  });

  it("Administración gestiona usuarios y configuración, pero no entrega turnos", () => {
    const admin = permissionsOfRole("admin");
    expect(admin).toContain("users.manage");
    expect(admin).toContain("settings.manage");
    expect(admin).not.toContain("handover.deliver");
    expect(admin).toHaveLength(21);
  });

  it("Dirección hace todo menos usuarios y configuración (nota 2)", () => {
    const direccion = permissionsOfRole("direccion");
    expect(direccion).not.toContain("users.manage");
    expect(direccion).not.toContain("settings.manage");
    expect(direccion).toContain("residents.update");
    expect(direccion).toContain("handover.deliver");
    expect(direccion).toHaveLength(21);
  });

  it("Enfermería edita datos y contactos, sin montos ni fotos del legajo (nota 1)", () => {
    const enfermeria = permissionsOfRole("enfermeria");
    expect(enfermeria).toContain("residents.update");
    expect(enfermeria).toContain("contacts.manage");
    expect(enfermeria).not.toContain("fees.read");
    expect(enfermeria).not.toContain("documents.files");
    expect(enfermeria).not.toContain("audit.read_all");
    expect(enfermeria).toHaveLength(13);
  });

  it("Cuidado ve fichas y emergencias, registra novedades y turnos, sin editar datos", () => {
    const cuidado = permissionsOfRole("cuidado");
    expect(cuidado).toEqual(
      [
        "audit.read_resident",
        "emergency.pdf",
        "emergency.view",
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
