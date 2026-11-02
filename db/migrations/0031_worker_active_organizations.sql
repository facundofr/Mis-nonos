-- Residencias activas con el módulo del abono encendido, para el trabajo
-- diario del worker (cuotas y avisos de vencimiento, 7.3-C4). Devuelve solo
-- identificadores: el trabajo de cada una lo hace con withSystemTenant.
CREATE OR REPLACE FUNCTION app.organizations_with_module(p_module text)
RETURNS TABLE (organization_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT o.id
  FROM public.organizations o
  JOIN public.organization_modules m ON m.organization_id = o.id
  WHERE o.status = 'active' AND m.module_key = p_module AND m.enabled
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.organizations_with_module(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.organizations_with_module(text) TO r360_worker;
