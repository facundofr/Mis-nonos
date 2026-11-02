#!/bin/sh
# Funciones comunes de las copias de seguridad. Las variables vienen del
# archivo de entorno del servicio "backup" (docs/runbooks/vps.md); los
# valores nunca se escriben en el log.

log() {
  printf '{"level":"%s","time":"%s","service":"backup","msg":"%s"}\n' \
    "$1" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$2"
}

# Avisa a un monitor externo (opcional), para que alerte si una copia no
# llega (F.8: el chequeo corre fuera del VPS). Sin URL, no hace nada.
ping_monitor() {
  if [ -n "${BACKUP_PING_URL:-}" ]; then
    curl -fsS -m 10 --retry 3 "${BACKUP_PING_URL}$1" >/dev/null || log warn "No se pudo avisar al monitor externo"
  fi
}

require() {
  for name in "$@"; do
    eval "value=\${$name:-}"
    if [ -z "$value" ]; then
      log error "Falta la variable $name"
      ping_monitor /fail
      exit 1
    fi
  done
}
