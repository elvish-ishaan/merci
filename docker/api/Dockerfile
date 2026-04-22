# --- Builder Stage ---
FROM oven/bun:latest AS builder

WORKDIR /app

# 1. Copy config files to root
COPY package.json bun.lockb* turbo.json bunfig.toml ./

# 2. Copy workspace folders
COPY packages ./packages
COPY apps/api ./apps/api

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
COPY --from=builder /app/apps/api ./apps/api

# 7. Set WORKDIR to the root for the CMD to have full context, 
WORKDIR /app/apps/api

# Expose port
EXPOSE 3001

# Health check (matches your logic)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["bun", "--eval", "const res = await fetch('http://localhost:' + (process.env.PORT ?? 3001) + '/health'); process.exit(res.ok ? 0 : 1)"]

# Start application
CMD ["bun", "run", "index.ts"]