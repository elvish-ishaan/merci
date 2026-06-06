# syntax=docker/dockerfile:1
# Builder stage
FROM oven/bun:latest AS builder

WORKDIR /app

# Copy monorepo root files
COPY package.json bun.lock turbo.json bunfig.toml ./

# Copy only the packages action-worker depends on
COPY packages/crypto ./packages/crypto
COPY packages/db ./packages/db
COPY packages/logger ./packages/logger
COPY packages/typescript-config ./packages/typescript-config

COPY apps/action-worker ./apps/action-worker

# Cache bun's package store between builds so re-installs are fast
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install

# Cache the Prisma binary engine download between builds (~50 MB, slow to re-fetch)
RUN --mount=type=cache,target=/root/.cache/prisma \
    cd packages/db && bun run db:generate

# Runtime stage
FROM oven/bun:slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git ca-certificates curl gnupg lsb-release \
  && install -m 0755 -d /etc/apt/keyrings \
  && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
  && chmod a+r /etc/apt/keyrings/docker.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" \
     > /etc/apt/sources.list.d/docker.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends docker-ce-cli \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/action-worker ./apps/action-worker

WORKDIR /app/apps/action-worker

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["bun", "--eval", "const {Redis} = require('ioredis'); const r = new Redis({host: process.env.REDIS_HOST||'localhost', port: Number(process.env.REDIS_PORT||6379)}); r.ping().then(()=>process.exit(0)).catch(()=>process.exit(1))"]

CMD ["bun", "run", "index.ts"]
