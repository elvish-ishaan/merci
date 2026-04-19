# Builder stage
FROM oven/bun:latest AS builder

WORKDIR /app

# Copy monorepo root files
COPY package.json bun.lock turbo.json bunfig.toml ./

# Copy workspace packages
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies
RUN bun install

# Generate the prisma client
RUN cd packages/db && bun run db:generate

# Runtime stage
FROM oven/bun:slim

WORKDIR /app

# Copy package.json and lock file
COPY --from=builder /app/package.json  ./

# Copy built dependencies
COPY --from=builder /app/node_modules ./node_modules

# Copy workspace packages
COPY --from=builder /app/packages ./packages

# Copy API source
COPY --from=builder /app/apps/api ./apps/api

# Set working directory to API
WORKDIR /app/apps/api

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["bun", "--eval", "const res = await fetch('http://localhost:' + (process.env.PORT ?? 3001) + '/health'); process.exit(res.ok ? 0 : 1)"]

# Start application
CMD ["bun", "run", "index.ts"]
