-- Fichaje (docs/decisions/0020, actualización del 03/11/2026): ver quién
-- está trabajando y el QR es solo de Administración. Dirección sigue
-- registrando su propia entrada y salida (attendance.record).
UPDATE permissions SET description = 'Ver el fichaje del personal y el QR'
WHERE key = 'attendance.read';
--> statement-breakpoint
DELETE FROM role_permissions rp
USING roles r, (VALUES
  ('attendance.read', 'direccion')
) AS m(permission_key, role_key)
WHERE rp.role_id = r.id
  AND r.organization_id IS NULL
  AND r.key = m.role_key
  AND rp.permission_key = m.permission_key;
