-- Seguimiento del cuidado (0034, docs/decisions/0017): permisos de la app,
-- permisos de la matriz, el módulo "care" encendido y las especialidades
-- iniciales en las residencias que ya existen. Nada se borra (E6):
-- - especialidades y profesionales se desactivan;
-- - una atención solo se anula (quién, cuándo y por qué);
-- - una emergencia se completa y se cierra.
GRANT SELECT, INSERT ON specialties TO r360_app;
--> statement-breakpoint
GRANT UPDATE (name, position, active, updated_at) ON specialties TO r360_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON professionals TO r360_app;
--> statement-breakpoint
GRANT UPDATE (specialty_id, name, kind, license_number, phone, institution, notes, active, updated_at) ON professionals TO r360_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON care_encounters TO r360_app;
--> statement-breakpoint
GRANT UPDATE (voided_at, voided_by, void_reason) ON care_encounters TO r360_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON emergencies TO r360_app;
--> statement-breakpoint
GRANT UPDATE (calls, transferred, transfer_destination, status, outcome, closed_at, closed_by, updated_at) ON emergencies TO r360_app;
--> statement-breakpoint

-- Permisos nuevos (lib/auth/permissions.ts; la prueba unitaria compara los dos).
INSERT INTO permissions (key, module_key, description) VALUES
  ('care.read', 'care', 'Ver profesionales, especialidades y atenciones'),
  ('care.record', 'care', 'Registrar y anular atenciones, también las de enfermería'),
  ('care.manage', 'care', 'Agregar y editar profesionales y especialidades'),
  ('emergencies.manage', 'care', 'Registrar, completar y cerrar emergencias');
--> statement-breakpoint
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, m.permission_key
FROM (VALUES
  ('care.read', 'admin'), ('care.read', 'direccion'), ('care.read', 'enfermeria'),
  ('care.record', 'admin'), ('care.record', 'direccion'), ('care.record', 'enfermeria'),
  ('care.manage', 'admin'), ('care.manage', 'direccion'),
  ('emergencies.manage', 'admin'), ('emergencies.manage', 'direccion'), ('emergencies.manage', 'enfermeria'), ('emergencies.manage', 'cuidado')
) AS m(permission_key, role_key)
JOIN roles r ON r.key = m.role_key AND r.organization_id IS NULL;
--> statement-breakpoint

-- Módulo encendido en las residencias que ya existen.
INSERT INTO organization_modules (organization_id, module_key, enabled, enabled_at)
SELECT o.id, 'care', true, now()
FROM organizations o
ON CONFLICT (organization_id, module_key) DO UPDATE SET enabled = true, enabled_at = now();
--> statement-breakpoint

-- Especialidades iniciales (lib/catalogs/defaults.ts, DEFAULT_SPECIALTIES).
INSERT INTO specialties (organization_id, key, name, position)
SELECT o.id, s.key, s.name, s.position
FROM organizations o
CROSS JOIN (VALUES
  (NULL, 'Medicina clínica', 1),
  ('enfermeria', 'Enfermería', 2),
  (NULL, 'Kinesiología', 3),
  (NULL, 'Nutrición', 4),
  (NULL, 'Psicología', 5),
  (NULL, 'Psiquiatría', 6),
  (NULL, 'Terapia ocupacional', 7),
  (NULL, 'Fonoaudiología', 8),
  (NULL, 'Odontología', 9),
  (NULL, 'Podología', 10)
) AS s(key, name, position)
ON CONFLICT (organization_id, name) DO NOTHING;
