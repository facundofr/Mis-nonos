# PostgreSQL 18 con las herramientas de copia de seguridad (F.8, 10.16):
#   - WAL-G: WAL continuo y copia completa diaria de la base, cifrados, a un
#     almacenamiento compatible con S3 fuera del VPS (recuperación a un
#     punto en el tiempo, pérdida máxima de 5 minutos).
#   - restic: copia cifrada de las fotos del legajo (DC-08).
#   - supercronic: corre los programados del servicio "backup".
# Se usa para dos servicios de Compose: "postgres" y "backup".
#
# Cada binario se descarga en una versión fija y se verifica su SHA-256
# (docs/decisions/0006). Para actualizar: cambiar versión y suma juntas.
# Binarios para amd64 (x86_64): el VPS tiene que ser de esa arquitectura.
FROM postgres:18.6-bookworm

ARG WALG_VERSION=v3.0.9
ARG WALG_SHA256=4f03ee4679db7f660bfd1b2b8291ac5df247cd2ec48074b60c112f4897299f24
ARG RESTIC_VERSION=0.19.1
ARG RESTIC_SHA256=f415415624dcc452f2a02b8c33641791a8c6d6d3b65bbb3543fcf9a25151585c
ARG SUPERCRONIC_VERSION=v0.2.51
ARG SUPERCRONIC_SHA256=cc232108374e8e2b537045f2d5eaa1229f619db314c3ba6a14d38b35dc0aa123

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl bzip2; \
    rm -rf /var/lib/apt/lists/*; \
    cd /tmp; \
    curl -fsSL -o wal-g.tar.gz \
      "https://github.com/wal-g/wal-g/releases/download/${WALG_VERSION}/wal-g-pg-22.04-amd64.tar.gz"; \
    echo "${WALG_SHA256}  wal-g.tar.gz" | sha256sum -c -; \
    tar -xzf wal-g.tar.gz; \
    install -m 0755 wal-g-pg-22.04-amd64 /usr/local/bin/wal-g; \
    curl -fsSL -o restic.bz2 \
      "https://github.com/restic/restic/releases/download/v${RESTIC_VERSION}/restic_${RESTIC_VERSION}_linux_amd64.bz2"; \
    echo "${RESTIC_SHA256}  restic.bz2" | sha256sum -c -; \
    bunzip2 restic.bz2; \
    install -m 0755 restic /usr/local/bin/restic; \
    curl -fsSL -o supercronic \
      "https://github.com/aptible/supercronic/releases/download/${SUPERCRONIC_VERSION}/supercronic-linux-amd64"; \
    echo "${SUPERCRONIC_SHA256}  supercronic" | sha256sum -c -; \
    install -m 0755 supercronic /usr/local/bin/supercronic; \
    rm -rf /tmp/*; \
    wal-g --version; restic version; supercronic -version

COPY backup/ /usr/local/share/residencia360-backup/
RUN chmod 0755 /usr/local/share/residencia360-backup/*.sh
