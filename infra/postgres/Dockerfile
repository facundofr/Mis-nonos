# PostgreSQL 18 con las herramientas de copia de seguridad (F.8, 10.16):
#   - WAL-G: WAL continuo y copia completa diaria de la base, cifrados, a un
#     almacenamiento compatible con S3 fuera del VPS (recuperación a un
#     punto en el tiempo, pérdida máxima de 5 minutos).
#   - restic: copia cifrada de las fotos del legajo (DC-08).
#   - supercronic: corre los programados del servicio "backup".
# Se usa para dos servicios de Compose: "postgres" y "backup".
#
# WAL-G, restic y gosu se compilan acá desde su código fuente, en un commit
# fijo, con un Go actual: los binarios publicados por sus autores están
# hechos con un Go viejo y el análisis de seguridad de la CI (Trivy) los
# marca por vulnerabilidades ya corregidas en Go. Los módulos de Go se
# verifican con go.sum. supercronic se descarga y se verifica su SHA-256.
# Versiones fijadas (docs/decisions/0006): para actualizar, cambiar la
# versión y el commit juntos.
# Binarios para amd64 (x86_64): el VPS tiene que ser de esa arquitectura.

# --- Herramientas compiladas con Go -----------------------------------------
FROM golang:1.27.3-bookworm AS tools
ARG WALG_VERSION=v3.0.9
ARG WALG_COMMIT=3e493188db28335fb93a45bd680c6ff8fc3028c1
ARG RESTIC_VERSION=v0.19.1
ARG RESTIC_COMMIT=6aa3a516ce654808a1f28f9fa21e9b7c8e6e90bf
ARG GOSU_VERSION=1.19
ARG GOSU_COMMIT=6456aaa0f3c854d199d0f037f068eb97515b7513
ENV GOTOOLCHAIN=local GOFLAGS=-trimpath
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends libbrotli-dev libsodium-dev; \
    rm -rf /var/lib/apt/lists/*
# - fetch clona en el commit exacto (no en la etiqueta, que se puede mover).
# - bump: dependencias con arreglos de seguridad posteriores a las que traen
#   esas versiones (las marca Trivy). Al actualizar restic o WAL-G, revisar
#   si siguen haciendo falta.
# - -buildvcs=false: sin la versión de git, que Trivy confunde con una vieja.
RUN set -eux; \
    fetch() { git init -q "$1"; git -C "$1" fetch -q --depth 1 "$2" "$3"; git -C "$1" checkout -q --detach FETCH_HEAD; \
      test "$(git -C "$1" rev-parse HEAD)" = "$3"; }; \
    fetch /src/gosu https://github.com/tianon/gosu.git "$GOSU_COMMIT"; \
    fetch /src/restic https://github.com/restic/restic.git "$RESTIC_COMMIT"; \
    fetch /src/wal-g https://github.com/wal-g/wal-g.git "$WALG_COMMIT"; \
    bump="github.com/go-jose/go-jose/v4@v4.1.6 golang.org/x/net@v0.60.0 google.golang.org/grpc@v1.83.2"; \
    cd /src/restic && go get $bump github.com/klauspost/compress@v1.18.7; \
    cd /src/wal-g && go get $bump; \
    export GOFLAGS="$GOFLAGS -buildvcs=false"; \
    cd /src/gosu && CGO_ENABLED=0 go build -ldflags "-s -w" -o /out/gosu .; \
    cd /src/restic && CGO_ENABLED=0 go build -ldflags "-s -w -X main.version=${RESTIC_VERSION#v}" -o /out/restic ./cmd/restic; \
    cd /src/wal-g && CGO_ENABLED=1 go build -tags "brotli libsodium" \
      -ldflags "-s -w -X github.com/wal-g/wal-g/cmd/pg.walgVersion=${WALG_VERSION} -X github.com/wal-g/wal-g/cmd/pg.gitRevision=${WALG_COMMIT}" \
      -o /out/wal-g ./main/pg

# --- Imagen final -----------------------------------------------------------
FROM postgres:18.6-bookworm

ARG SUPERCRONIC_VERSION=v0.2.51
ARG SUPERCRONIC_SHA256=cc232108374e8e2b537045f2d5eaa1229f619db314c3ba6a14d38b35dc0aa123

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl libbrotli1 libsodium23; \
    cd /tmp; \
    curl -fsSL -o supercronic \
      "https://github.com/aptible/supercronic/releases/download/${SUPERCRONIC_VERSION}/supercronic-linux-amd64"; \
    echo "${SUPERCRONIC_SHA256}  supercronic" | sha256sum -c -; \
    install -m 0755 supercronic /usr/local/bin/supercronic; \
    rm -rf /var/lib/apt/lists/* /tmp/*

COPY --from=tools /out/wal-g /out/restic /usr/local/bin/
# Reemplaza el gosu de la imagen oficial (mismo commit, Go actual).
COPY --from=tools /out/gosu /usr/local/bin/gosu
RUN wal-g --version && restic version && supercronic -version && gosu --version

COPY backup/ /usr/local/share/residencia360-backup/
RUN chmod 0755 /usr/local/share/residencia360-backup/*.sh
