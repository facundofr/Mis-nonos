#!/bin/sh
# archive_command de PostgreSQL: sube cada segmento de WAL, cifrado, al
# almacenamiento externo. Si falla, PostgreSQL reintenta y conserva el
# segmento: nunca se pierde WAL por un error de red. Si las fallas siguen,
# el disco se llena: hay alerta de disco (docs/runbooks/base-caida.md).
#
# Solo se usa con PG_ARCHIVE_MODE=on (infra/compose/production.yaml), una
# vez configurado el almacenamiento (docs/runbooks/restauracion.md).
set -eu
exec wal-g wal-push "$1"
