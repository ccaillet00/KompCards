# KompCards Frontend — Nuxt 4 (siehe docs/DEVELOPMENT.md)
#
# Build-Stage: Nuxt wird mit Bun gebaut (passendes bun.lock).
# Laufzeit-Stage: Nuxt-Produktions-Server (Node) aus .output/, Port 3000.
# Same-origin: /api wird vom Traefik ans Backend geroutet — kein Proxy hier.

FROM oven/bun:1 AS builder
WORKDIR /app

# Dependencies zuerst (bessere Cache-Nutzung)
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Quellcode + Build
COPY . .
RUN bun run build

# Laufzeit: schlankes Node-Image
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000

COPY --from=builder /app/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
