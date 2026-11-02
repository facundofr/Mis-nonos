-- Etapa 2.3: permisos de las tablas de identidad e invitaciones, búsqueda
-- de invitaciones sin contexto de residencia y roles de sistema (F.3).

-- Identidad: sin RLS (docs/decisions/0003). Sesiones, verificaciones y
-- segundo factor admiten DELETE porque son credenciales temporales de
-- Better Auth (cerrar la sesión, usar un enlace, rehacer el 2FA), no datos
-- del negocio. Las cuentas no se borran.
GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO r360_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON verifications TO r360_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON two_factors TO r360_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON accounts TO r360_app;
--> statement-breakpoint

-- Invitaciones: tabla operativa con RLS y sin DELETE (se revocan).
GRANT SELECT, INSERT, UPDATE ON invitations TO r360_app;
--> statement-breakpoint

-- Quien abre un enlace de invitación todavía no tiene sesión ni residencia.
-- Esta función, del rol dueño, devuelve solo la invitación cuyo hash
-- coincide; el token tiene 256 bits, así que no se puede adivinar.
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
         i.role_id, r.key, r.name, i.phone, i.license_number, i.expires_at,
         i.accepted_at, i.revoked_at
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
--> statement-breakpoint

-- Roles de sistema del MVP (F.3). Sus permisos se cargan en la Etapa 2.4.
INSERT INTO roles (key, name) VALUES
  ('admin', 'Administración'),
  ('direccion', 'Dirección'),
  ('enfermeria', 'Enfermería'),
  ('cuidado', 'Cuidador/a');
