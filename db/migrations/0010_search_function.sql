-- Búsqueda sin acentos ni mayúsculas (F1-STK-05, 10.12). unaccent() no es
-- IMMUTABLE y no se puede usar en un índice ni en una columna generada:
-- esta versión fija el diccionario y sí lo es. La usan la columna
-- residents.search_text y las búsquedas de la app.
CREATE OR REPLACE FUNCTION app.normalize_search(value text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT lower(public.unaccent('public.unaccent'::regdictionary, value)) $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.normalize_search(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.normalize_search(text) TO r360_app;
