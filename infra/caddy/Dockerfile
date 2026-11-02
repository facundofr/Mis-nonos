# Caddy con el módulo de límite de pedidos (sección 10.14): el Caddy oficial
# no lo trae. Versiones fijadas (docs/decisions/0006): Caddy 2.11.7 y
# caddy-ratelimit en un commit concreto, del autor de Caddy.
FROM caddy:2.11.7-builder AS builder
RUN xcaddy build v2.11.7 \
    --with github.com/mholt/caddy-ratelimit@5625512f24f6f59d6f64fb3aafe5eecff0b286db

FROM caddy:2.11.7-alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
COPY Caddyfile /etc/caddy/Caddyfile
