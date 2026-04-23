# --- Builder Stage ---
FROM oven/bun:latest AS builder

WORKDIR /app

# 1. Copy config files to root
COPY package.json bun.lock* turbo.json bunfig.toml ./

# 2. Copy workspace folders
COPY packages ./packages
COPY apps/mercob ./apps/mercob

# 3. Install ALL dependencies
RUN bun install

# 4. Generate Prisma Client 
RUN cd packages/db && bunx prisma generate

# --- Runtime Stage ---
FROM oven/bun:slim

WORKDIR /app

# 5. Copy configuration files so Turbo/Bun context is preserved
COPY --from=builder /app/package*.json /app/bun.lock* /app/turbo.json /app/bunfig.toml ./

# 6. Copy the heavy lifting
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/mercob ./apps/mercob

# 7. Set WORKDIR to the root for the CMD to have full context, 
WORKDIR /app/apps/mercob

# Health check: verify heartbeat file was written within the last 2 minutes
HEALTHCHECK --interval=90s --timeout=5s --start-period=30s --retries=3 \
  CMD sh -c 'test -f /tmp/mercob.healthy && test $(( $(date +%s) - $(cat /tmp/mercob.healthy) )) -lt 120'

# Start application
CMD ["bun", "run", "index.ts"]