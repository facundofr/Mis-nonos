import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  effectivePermissions,
  PERMISSION_KEYS,
  PERMISSIONS,
  rolePermissionPairs,
} from "@/lib/auth/permissions";

// El catálogo está en la migración original y en las que suman permisos. Desde
// los roles nuevos (docs/decisions/0021), la matriz entera se carga en 0040.
const read = (file: string) =>
  readFileSync(path.resolve(__dirname, "../../db/migrations", file), "utf8");
const catalogMigrations = [
  "0005_permissions_matrix.sql",
  "0035_care_grants.sql",
  "0037_attendance_grants.sql",
  "0040_roles_master_admin_profesional_asistente.sql",
]
  .map(read)
  .join("\n");
const matrixMigration = read("0040_roles_master_admin_profesional_asistente.sql");
// El abono y las novedades se quitaron después (docs/decisions/0024).
const removalMigration = read("0042_remove_fees_notes_nursing.sql");
const removed = new Set(
  [
    ...(
      removalMigration.match(/DELETE FROM permissions\s+WHERE key IN \(([^)]*)\)/)?.[1] ?? ""
    ).matchAll(/'([a-z_.]+)'/g),
  ].map(([, key]) => key),
);

function permissionsOfRole(role: string) {
  return rolePermissionPairs()
    .filter((pair) => pair.role === role)
    .map((pair) => pair.permission)
    .sort();
}

describe("matriz de permisos (docs/decisions/0021)", () => {
  it("la migración tiene el mismo catálogo que el código", () => {
    const catalog = [...catalogMigrations.matchAll(/\('([a-z_.]+)', '([a-z_]+)', '[^']+'\)/g)]
      .filter(([, key]) => !removed.has(key!))
      .map(([, key, module]) => `${key}:${module}`);
    const expected = PERMISSION_KEYS.map((key) => `${key}:${PERMISSIONS[key].module}`);
    expect(catalog.sort()).toEqual(expected.sort());
  });

  it("la migración tiene los mismos pares (permiso, rol) que el código", () => {
    const pairs = [
      ...matrixMigration.matchAll(/\('([a-z_.]+)', '(master|admin|profesional|asistente)'\)/g),
    ]
      .filter(([, permission]) => !removed.has(permission!))
      .map(([, permission, role]) => `${permission}:${role}`);
    const expected = rolePermissionPairs().map((pair) => `${pair.permission}:${pair.role}`);
    expect(pairs.sort()).toEqual(expected.sort());
    expect(expected).toHaveLength(65);
  });

  it("Master tiene todo, incluido el registro completo de cambios", () => {
    expect(permissionsOfRole("master")).toEqual([...PERMISSION_KEYS].sort());
  });

  it("Administración tiene todo menos el registro completo", () => {
    const admin = permissionsOfRole("admin");
    expect(admin).not.toContain("audit.master");
    expect(admin).toContain("users.manage");
    expect(admin).toContain("residents.update");
    expect(admin).toContain("handover.deliver");
    expect(admin).toHaveLength(PERMISSION_KEYS.length - 1);
  });

  it("Profesional escribe sobre los pacientes, pero no edita datos ni gestiona", () => {
    const profesional = permissionsOfRole("profesional");
    expect(profesional).toContain("care.record");
    expect(profesional).toContain("handover.deliver");
    expect(profesional).toContain("emergencies.manage");
    expect(profesional).not.toContain("residents.update");
    expect(profesional).not.toContain("contacts.manage");
    expect(profesional).not.toContain("users.manage");
    expect(profesional).not.toContain("attendance.read");
    expect(profesional).toHaveLength(11);
  });

  it("Asistente solo ve a los pacientes y ficha", () => {
    expect(permissionsOfRole("asistente")).toEqual(
      [
        "attendance.record",
        "emergency.pdf",
        "emergency.view",
        "residents.read",
        "staff.read",
      ].sort(),
    );
  });
});

describe("effectivePermissions (módulos activables, E3)", () => {
  it("descarta los permisos de módulos apagados y las claves desconocidas", () => {
    const granted = ["residents.read", "care.read", "permiso.inventado"];
    expect([...effectivePermissions(granted, ["core"])]).toEqual(["residents.read"]);
    expect([...effectivePermissions(granted, ["core", "care"])].sort()).toEqual([
      "care.read",
      "residents.read",
    ]);
    expect(effectivePermissions(granted, []).size).toBe(0);
  });
});
