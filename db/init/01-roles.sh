#!/bin/sh
# Se ejecuta una sola vez, al crear la base por primera vez (imagen oficial
# de PostgreSQL). Crea los roles de la sección 10.13:
#   r360_owner:  dueño de la base y de las tablas; corre las migraciones.
#   r360_app:    con el que se conecta la app; sin BYPASSRLS y sin ser dueño.
#   r360_worker: el de la cola de trabajos (pg-boss). Es dueño solo del
#                esquema pgboss; en las tablas de la app puede leer y marcar
#                los eventos de dominio y nada más (docs/decisions/0005).
# En producción, estos roles se crean siguiendo el manual de base de datos.
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
CREATE ROLE r360_owner LOGIN PASSWORD '${R360_OWNER_PASSWORD}'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE r360_app LOGIN PASSWORD '${R360_APP_PASSWORD}'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE r360_worker LOGIN PASSWORD '${R360_WORKER_PASSWORD}'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

-- Formulario público (12.9): sin login. La app lo asume con SET LOCAL ROLE
-- en esa sola transacción; INHERIT FALSE: la app no recibe sus políticas.
-- Sus permisos (solo agregar solicitudes) están en la migración 0033.
CREATE ROLE r360_public NOLOGIN
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT r360_public TO r360_app WITH INHERIT FALSE, SET TRUE;

ALTER DATABASE "${POSTGRES_DB}" OWNER TO r360_owner;
ALTER SCHEMA public OWNER TO r360_owner;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO r360_app, r360_worker, r360_public;

-- La cola de trabajos vive en su propio esquema, del worker: pg-boss crea
-- ahí sus tablas al arrancar. Ni la app ni el dueño de las tablas lo usan.
CREATE SCHEMA pgboss AUTHORIZATION r360_worker;

-- Requiere superusuario: se crea acá y no en las migraciones.
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
EOSQL
