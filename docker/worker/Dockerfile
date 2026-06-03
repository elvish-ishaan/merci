# Builder stage
FROM oven/bun:latest AS builder

WORKDIR /app

# Copy monorepo root files
COPY package.json bun.lock turbo.json bunfig.toml ./

# Copy workspace packages
COPY packages ./packages
COPY apps/worker ./apps/worker

# Install dependencies
RUN bun install

# Generate the prisma client
RUN cd packages/db && bun run db:generate

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

# Copy package.json and lock file
COPY --from=builder /app/package.json ./

# Copy built dependencies
COPY --from=builder /app/node_modules ./node_modules

# Copy workspace packages
COPY --from=builder /app/packages ./packages

# Copy worker source
COPY --from=builder /app/apps/worker ./apps/worker

# Set working directory to worker
WORKDIR /app/apps/worker

# Health check - verify Redis connection
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["bun", "--eval", "const Redis = require('ioredis'); const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379'); redis.ping().then(() => process.exit(0)).catch(() => process.exit(1))"]

# Start worker process
CMD ["bun", "run", "index.ts"]
