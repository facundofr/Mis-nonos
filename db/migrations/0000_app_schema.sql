-- Base común: extensiones y funciones de contexto para RLS (sección 10.13).
-- Se aplica con el rol dueño (r360_owner). pg_stat_statements la crea el
-- superusuario (db/init/01-roles.sh) porque no es una extensión "trusted".

CREATE EXTENSION IF NOT EXISTS citext;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint

-- Esquema para funciones auxiliares de la app.
CREATE SCHEMA IF NOT EXISTS app;
--> statement-breakpoint
REVOKE ALL ON SCHEMA app FROM PUBLIC;
--> statement-breakpoint
GRANT USAGE ON SCHEMA app TO r360_app;
--> statement-breakpoint

-- Organización y usuario de la transacción. Los fija el servidor con
-- set_config(..., true), así que valen solo dentro de esa transacción.
-- Sin contexto devuelven NULL y las políticas no dejan ver ninguna fila.
CREATE OR REPLACE FUNCTION app.current_org_id() RETURNS uuid
  LANGUAGE sql STABLE PARALLEL SAFE
  AS $$ SELECT NULLIF(current_setting('app.org_id', true), '')::uuid $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.current_user_id() RETURNS uuid
  LANGUAGE sql STABLE PARALLEL SAFE
  AS $$ SELECT NULLIF(current_setting('app.user_id', true), '')::uuid $$;
