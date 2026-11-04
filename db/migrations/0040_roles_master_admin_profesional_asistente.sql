-- Roles nuevos (docs/decisions/0021): Master, Administración, Profesional y
-- Asistente. Dirección pasa a Administración; Enfermería, a Profesional (con
-- la profesión "Enfermería" si no tenía); Cuidador/a pasa a llamarse
-- Asistente. La matriz completa se vuelve a cargar acá: es la misma que
-- lib/auth/permissions.ts y una prueba unitaria compara las dos.

INSERT INTO roles (key, name) VALUES
  ('master', 'Master'),
  ('profesional', 'Profesional');
--> statement-breakpoint
UPDATE roles SET key = 'asistente', name = 'Asistente'
WHERE key = 'cuidado' AND organization_id IS NULL;
--> statement-breakpoint
INSERT INTO permissions (key, module_key, description) VALUES
  ('audit.master', 'core', 'Ver el registro completo de cambios de la app');
--> statement-breakpoint

-- Las personas y las invitaciones pendientes pasan a los roles nuevos.
UPDATE organization_memberships m
SET role_id = (SELECT id FROM roles WHERE key = 'admin' AND organization_id IS NULL),
    updated_at = now()
FROM roles r
WHERE r.id = m.role_id AND r.organization_id IS NULL AND r.key = 'direccion';
--> statement-breakpoint
UPDATE organization_memberships m
SET role_id = (SELECT id FROM roles WHERE key = 'profesional' AND organization_id IS NULL),
    profession = coalesce(nullif(trim(m.profession), ''), 'Enfermería'),
    updated_at = now()
FROM roles r
WHERE r.id = m.role_id AND r.organization_id IS NULL AND r.key = 'enfermeria';
--> statement-breakpoint
UPDATE invitations i
SET role_id = (SELECT id FROM roles WHERE key = 'admin' AND organization_id IS NULL)
FROM roles r
WHERE r.id = i.role_id AND r.organization_id IS NULL AND r.key = 'direccion';
--> statement-breakpoint
UPDATE invitations i
SET role_id = (SELECT id FROM roles WHERE key = 'profesional' AND organization_id IS NULL),
    profession = 'Enfermería'
FROM roles r
WHERE r.id = i.role_id AND r.organization_id IS NULL AND r.key = 'enfermeria';
--> statement-breakpoint

-- La matriz anterior se borra entera y se carga la nueva.
DELETE FROM role_permissions rp
USING roles r
WHERE rp.role_id = r.id AND r.organization_id IS NULL;
--> statement-breakpoint
-- Si alguien quedara con un rol viejo, la clave foránea frena el borrado.
DELETE FROM roles WHERE organization_id IS NULL AND key IN ('direccion', 'enfermeria');
--> statement-breakpoint
INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, m.permission_key
FROM (VALUES
  ('residents.read', 'master'), ('residents.read', 'admin'), ('residents.read', 'profesional'), ('residents.read', 'asistente'),
  ('residents.update', 'master'), ('residents.update', 'admin'),
  ('residents.status', 'master'), ('residents.status', 'admin'),
  ('residents.discharge', 'master'), ('residents.discharge', 'admin'),
  ('admissions.manage', 'master'), ('admissions.manage', 'admin'),
  ('admission_requests.manage', 'master'), ('admission_requests.manage', 'admin'),
  ('documents.files', 'master'), ('documents.files', 'admin'),
  ('contacts.manage', 'master'), ('contacts.manage', 'admin'),
  ('emergency.view', 'master'), ('emergency.view', 'admin'), ('emergency.view', 'profesional'), ('emergency.view', 'asistente'),
  ('emergency.pdf', 'master'), ('emergency.pdf', 'admin'), ('emergency.pdf', 'profesional'), ('emergency.pdf', 'asistente'),
  ('notes.create', 'master'), ('notes.create', 'admin'), ('notes.create', 'profesional'),
  ('notes.edit_own', 'master'), ('notes.edit_own', 'admin'), ('notes.edit_own', 'profesional'),
  ('notes.resolve', 'master'), ('notes.resolve', 'admin'), ('notes.resolve', 'profesional'),
  ('handover.deliver', 'master'), ('handover.deliver', 'admin'), ('handover.deliver', 'profesional'),
  ('handover.confirm', 'master'), ('handover.confirm', 'admin'), ('handover.confirm', 'profesional'),
  ('staff.read', 'master'), ('staff.read', 'admin'), ('staff.read', 'profesional'), ('staff.read', 'asistente'),
  ('attendance.record', 'master'), ('attendance.record', 'admin'), ('attendance.record', 'profesional'), ('attendance.record', 'asistente'),
  ('attendance.read', 'master'), ('attendance.read', 'admin'),
  ('users.manage', 'master'), ('users.manage', 'admin'),
  ('settings.manage', 'master'), ('settings.manage', 'admin'),
  ('fees.read', 'master'), ('fees.read', 'admin'),
  ('fees.manage', 'master'), ('fees.manage', 'admin'),
  ('audit.read_resident', 'master'), ('audit.read_resident', 'admin'), ('audit.read_resident', 'profesional'),
  ('audit.read_all', 'master'), ('audit.read_all', 'admin'),
  ('audit.master', 'master'),
  ('org.export', 'master'), ('org.export', 'admin'),
  ('care.read', 'master'), ('care.read', 'admin'), ('care.read', 'profesional'),
  ('care.record', 'master'), ('care.record', 'admin'), ('care.record', 'profesional'),
  ('care.manage', 'master'), ('care.manage', 'admin'),
  ('emergencies.manage', 'master'), ('emergencies.manage', 'admin'), ('emergencies.manage', 'profesional')
) AS m(permission_key, role_key)
JOIN roles r ON r.key = m.role_key AND r.organization_id IS NULL;
--> statement-breakpoint

-- La invitación lleva la profesión hasta la membresía.
DROP FUNCTION app.find_invitation(text);
--> statement-breakpoint
CREATE FUNCTION app.find_invitation(p_token_hash text)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  organization_name text,
  site_id uuid,
  email text,
  name text,
  role_id uuid,
  role_key text,
  role_name text,
  phone text,
  profession text,
  license_number text,
  expires_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT i.id, i.organization_id, o.name, i.site_id, i.email::text, i.name,
         i.role_id, r.key, r.name, i.phone, i.profession, i.license_number,
         i.expires_at, i.accepted_at, i.revoked_at
  FROM public.invitations i
  JOIN public.organizations o ON o.id = i.organization_id
  JOIN public.roles r ON r.id = i.role_id
  WHERE i.token_hash = p_token_hash
    AND o.status = 'active'
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.find_invitation(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.find_invitation(text) TO r360_app;
