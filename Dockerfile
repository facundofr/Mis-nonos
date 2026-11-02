# syntax=docker/dockerfile:1
#
# Imagen única de Residencia360 (sección 10.10): la app (Next.js
# standalone), el worker y las herramientas de operación (migraciones y
# alta de residencias). El mismo artefacto va a staging y a producción; el
# servicio de Compose elige qué proceso corre (infra/compose/production.yaml).
#
# Versiones fijadas: docs/decisions/0001 y 0006.

ARG NODE_IMAGE=node:24.22.1-bookworm-slim

# --- Dependencias -----------------------------------------------------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN corepack pnpm install --frozen-lockfile

# --- Compilación ------------------------------------------------------------
FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack pnpm build \
 && corepack pnpm worker:build \
 && corepack pnpm tools:build

# --- Imagen final -----------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    STORAGE_DIR=/data/storage

# El código queda de root y solo de lectura para el proceso, que corre como
# "node" (sin privilegios). Solo puede escribir en las fotos y en la caché.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/dist ./dist
COPY --from=build /app/db/migrations ./db/migrations
RUN mkdir -p /data/storage /app/.next/cache \
 && chown node:node /data/storage /app/.next/cache

USER node
EXPOSE 3000
CMD ["node", "server.js"]
