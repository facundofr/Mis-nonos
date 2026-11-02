-- ¿La persona de la transacción tiene este permiso en la residencia de la
-- transacción? Mismo cálculo que can() en la app (lib/auth): rol de la
-- membresía activa, permiso del rol y módulo encendido. Lo usan las
-- políticas RLS de datos especialmente sensibles, como el abono (12.10):
-- así Enfermería y Cuidado no ven montos ni con un error en la app.
-- SECURITY DEFINER: lee las tablas de permisos sin depender de su RLS.
CREATE OR REPLACE FUNCTION app.current_user_can(p_permission text) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = pg_catalog, pg_temp
  AS $$
    SELECT EXISTS (
      SELECT 1
      FROM public.organization_memberships m
      JOIN public.role_permissions rp ON rp.role_id = m.role_id
      JOIN public.permissions p ON p.key = rp.permission_key
      JOIN public.organization_modules om
        ON om.organization_id = m.organization_id
       AND om.module_key = p.module_key
       AND om.enabled
      WHERE m.organization_id = app.current_org_id()
        AND m.user_id = app.current_user_id()
        AND m.status = 'active'
        AND rp.permission_key = p_permission
    )
  $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.current_user_can(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.current_user_can(text) TO r360_app;
