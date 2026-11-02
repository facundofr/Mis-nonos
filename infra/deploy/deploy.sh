#!/usr/bin/env bash
# Despliega en el VPS la versión de un commit (docs/runbooks/despliegue.md).
#
# Uso, en el VPS, con el usuario de despliegue:
#   bash /opt/residencia360/infra/deploy/deploy.sh <commit>
#
# Pone el repositorio en ese commit (para que Compose y la imagen coincidan),
# consigue la imagen de ese commit, aplica las migraciones y reinicia la app
# y el worker. Volver atrás es correr esto con el commit anterior.
#
# La imagen sale de IMAGE_SOURCE en compose.env:
#   registry (por defecto)  la baja de IMAGE_REPO (GHCR, la publica deploy.yml);
#   build                   la construye en el VPS (sin registro; DEPLOY.md).
set -euo pipefail

# Todo va dentro de una función: bash la lee completa antes de ejecutarla,
# así que cambiar de commit (que reemplaza este archivo) no la afecta.
main() {
  local commit="${1:?Uso: deploy.sh <commit>}"
  local base=/opt/residencia360
  local config=/etc/residencia360/compose.env

  cd "$base"
  git fetch --quiet origin
  git checkout --quiet --detach "$commit"
  local short
  short="$(git rev-parse --short=12 HEAD)"

  local image_source
  image_source="$(grep -E '^IMAGE_SOURCE=' "$config" | cut -d= -f2- || true)"
  local compose=(docker compose --env-file "$config" -f infra/compose/production.yaml)

  if [[ "${image_source:-registry}" == "build" ]]; then
    export APP_IMAGE="residencia360-app:sha-${short}"
    echo "Construyendo ${APP_IMAGE} en este servidor"
    docker build --pull -t "$APP_IMAGE" .
  else
    local image_repo
    image_repo="$(grep -E '^IMAGE_REPO=' "$config" | cut -d= -f2-)"
    export APP_IMAGE="${image_repo:?Falta IMAGE_REPO en $config}:sha-${short}"
    echo "Desplegando ${APP_IMAGE}"
    "${compose[@]}" pull app worker
  fi
  # Las migraciones agregan sin romper la versión anterior (expandir y
  # después contraer, 10.16): si algo falla después, se puede volver atrás.
  "${compose[@]}" run --rm migrate
  "${compose[@]}" up -d --build --remove-orphans
  "${compose[@]}" ps

  printf '%s %s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$short" "$(id -un)" >>"$base/deploys.log"
  echo "Listo: ${short}. Historial en ${base}/deploys.log"
}

main "$@"
exit
