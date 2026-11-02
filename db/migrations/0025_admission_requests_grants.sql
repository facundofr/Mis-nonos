-- Permisos de las solicitudes de ingreso (0024). La app las crea, edita y
-- cambia de estado, pero no las borra (E6). El único borrado es el de
-- DC-14: las que no se convirtieron, 12 meses después de su última
-- actividad. Lo hace el worker con esta función; la app no puede.
GRANT SELECT, INSERT, UPDATE ON admission_requests TO r360_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON admission_request_contacts TO r360_app;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.purge_stale_admission_requests(p_months integer)
RETURNS TABLE (organization_id uuid, deleted integer)
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  WITH deleted AS (
    DELETE FROM public.admission_requests r
    WHERE r.status <> 'converted'
      AND r.updated_at < now() - make_interval(months => p_months)
    RETURNING r.organization_id
  )
  SELECT d.organization_id, count(*)::integer FROM deleted d GROUP BY d.organization_id
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.purge_stale_admission_requests(integer) FROM PUBLIC;
--> statement-breakpoint
GRANT USAGE ON SCHEMA app TO r360_worker;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.purge_stale_admission_requests(integer) TO r360_worker;
