-- Permisos del rol del worker (r360_worker), que corre la cola de trabajos
-- (pg-boss) en su propio esquema pgboss (db/init/01-roles.sh).
--
-- En las tablas de la app, el worker solo lee los eventos de dominio y
-- marca cuándo los procesó: nada más (docs/decisions/0005). El trabajo de
-- cada residencia (avisos, emails) lo hace con el rol de la app, dentro
-- de withTenant, con las mismas políticas RLS que la app.

GRANT SELECT ON domain_events TO r360_worker;
--> statement-breakpoint
GRANT UPDATE (processed_at) ON domain_events TO r360_worker;
