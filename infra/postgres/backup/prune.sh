#!/bin/sh
# Retención de las copias (semanal):
#   - base: las últimas 14 copias completas y el WAL que las une;
#   - fotos: 14 diarias, 8 semanales y 12 mensuales.
# El plazo de conservación de los datos de un paciente egresado lo define
# el asesoramiento legal (12.7); esto es solo la retención de las copias.
set -eu
. /usr/local/share/residencia360-backup/common.sh

require WALG_S3_PREFIX RESTIC_REPOSITORY RESTIC_PASSWORD

log info "Limpieza de copias viejas: inicio"
wal-g delete retain FULL 14 --confirm
restic forget --keep-daily 14 --keep-weekly 8 --keep-monthly 12 --prune --quiet
restic check --quiet
log info "Limpieza de copias viejas: terminada"
