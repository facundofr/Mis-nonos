#!/bin/sh
# Copia completa diaria de la base con WAL-G. Junto con el WAL continuo que
# sube PostgreSQL (archive-wal.sh), permite volver a cualquier momento de
# los últimos días (docs/runbooks/restauracion.md).
set -eu
. /usr/local/share/residencia360-backup/common.sh

require WALG_S3_PREFIX WALG_LIBSODIUM_KEY PGHOST PGUSER PGPASSWORD

log info "Copia completa de la base: inicio"
if wal-g backup-push "${PGDATA:-/var/lib/postgresql/18/docker}"; then
  log info "Copia completa de la base: terminada"
  ping_monitor ""
else
  log error "Copia completa de la base: falló"
  ping_monitor /fail
  exit 1
fi
