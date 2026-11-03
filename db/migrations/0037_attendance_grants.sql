-- Asistencia del personal (0036, docs/decisions/0020): permisos de la app y
-- de la matriz. Los registros solo se agregan: sin UPDATE ni DELETE (E6).
-- El código del QR (sites.attendance_token) ya lo cubre el GRANT UPDATE de
-- sites (0002); solo lo cambia quien tiene settings.manage.
GRANT SELECT, INSERT ON attendance_records TO r360_app;
--> statement-breakpoint

-- Permisos nuevos (lib/auth/permissions.ts; la prueba unitaria compara los dos).
INSERT INTO permissions (key, module_key, description) VALUES
  ('attendance.record', 'core', 'Registrar la propia entrada y salida'),
  ('attendance.read', 'core', 'Ver quién está en la residencia');
--> statement-breakpoint
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, m.permission_key
FROM (VALUES
  ('attendance.record', 'admin'), ('attendance.record', 'direccion'), ('attendance.record', 'enfermeria'), ('attendance.record', 'cuidado'),
  ('attendance.read', 'admin'), ('attendance.read', 'direccion')
) AS m(permission_key, role_key)
JOIN roles r ON r.key = m.role_key AND r.organization_id IS NULL;
