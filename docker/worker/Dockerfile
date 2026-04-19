# Builder stage
FROM oven/bun:latest AS builder

WORKDIR /app

# Copy monorepo root files
COPY package.json bun.lockb ./

# Copy workspace packages
COPY packages ./packages
COPY apps/worker ./apps/worker

# Install dependencies
RUN bun install --frozen-lockfile

# Build workspace packages
RUN cd packages && bun run build || true


# Runtime stage
FROM oven/bun:distroless

WORKDIR /app

# Copy package.json and lock file
COPY --from=builder /app/package.json /app/bun.lockb ./

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
  CMD bun run --eval "const Redis = require('ioredis'); const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379'); redis.ping().then(() => process.exit(0)).catch(() => process.exit(1))"

# Start worker process
CMD ["bun", "run", "start"]
