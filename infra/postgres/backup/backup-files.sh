#!/bin/sh
# Copia diaria de las fotos del legajo con restic (DC-08): cifrada con
# RESTIC_PASSWORD y fuera del VPS. Solo sube lo que cambió.
set -eu
. /usr/local/share/residencia360-backup/common.sh

require RESTIC_REPOSITORY RESTIC_PASSWORD

log info "Copia de las fotos: inicio"
if restic backup /data/storage --tag fotos --no-scan --quiet; then
  log info "Copia de las fotos: terminada"
  ping_monitor ""
else
  log error "Copia de las fotos: falló"
  ping_monitor /fail
  exit 1
fi
