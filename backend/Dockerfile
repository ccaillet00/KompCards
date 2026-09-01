# KompCards Backend — Bun-Basis (siehe docs/DEVELOPMENT.md)
# Bun führt TypeScript nativ aus; kein separater Build-Step nötig.
FROM oven/bun:1

WORKDIR /app

# Dependencies zuerst (bessere Cache-Nutzung)
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Quellcode
COPY . .

EXPOSE 4000

# Nicht als root laufen
USER bun

CMD ["bun", "src/index.ts"]
