-- Permisos del formulario público (12.9). El rol r360_public lo crea
-- db/init/01-roles.sh (o el manual de producción), igual que los demás.
-- Solo puede agregar filas en tres tablas, y las políticas de 0032 lo
-- limitan a una solicitud nueva de la landing, su evento y su auditoría.
-- Sin SELECT: no lee nada, ni lo que acaba de agregar (sin RETURNING).
GRANT USAGE ON SCHEMA app TO r360_public;
--> statement-breakpoint
GRANT INSERT ON admission_requests, domain_events, audit_events TO r360_public;
--> statement-breakpoint
-- La residencia se resuelve en el servidor por la dirección de la landing,
-- nunca por un dato del navegador. Devuelve solo lo que la landing muestra
-- y solo si el formulario está activado y la residencia sigue activa.
CREATE OR REPLACE FUNCTION app.public_intake_site(p_slug text)
RETURNS TABLE (
  organization_id uuid,
  site_id uuid,
  name text,
  address text,
  phone text,
  intro text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT s.organization_id, s.id, s.name, s.address, s.phone, s.public_intro
  FROM public.sites s
  JOIN public.organizations o ON o.id = s.organization_id
  WHERE s.public_slug = lower(p_slug)
    AND s.public_intake_enabled
    AND s.status = 'active'
    AND o.status = 'active'
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.public_intake_site(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.public_intake_site(text) TO r360_public;
