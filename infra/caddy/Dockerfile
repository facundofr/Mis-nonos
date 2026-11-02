# Caddy con el módulo de límite de pedidos (sección 10.14): el Caddy oficial
# no lo trae. Versiones fijadas (docs/decisions/0006): Caddy 2.11.7 y
# caddy-ratelimit en un commit concreto, del autor de Caddy.
#
# go-jose y x/net van en versiones con arreglos de seguridad posteriores a
# las que trae Caddy 2.11.7 (las marca Trivy en la CI). Al actualizar
# Caddy, revisar si siguen haciendo falta.
FROM caddy:2.11.7-builder AS builder
RUN xcaddy build v2.11.7 \
    --with github.com/mholt/caddy-ratelimit@5625512f24f6f59d6f64fb3aafe5eecff0b286db \
    --replace github.com/go-jose/go-jose/v4=github.com/go-jose/go-jose/v4@v4.1.6 \
    --replace golang.org/x/net=golang.org/x/net@v0.60.0

FROM caddy:2.11.7-alpine
# Parches de seguridad de los paquetes de Alpine (brotli, curl) publicados
# después de la imagen base.
RUN apk upgrade --no-cache
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
COPY Caddyfile /etc/caddy/Caddyfile
