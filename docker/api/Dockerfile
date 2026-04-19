# Builder stage
FROM oven/bun:latest AS builder

WORKDIR /app

# Copy monorepo root files
COPY package.json bun.lockb ./

# Copy workspace packages
COPY packages ./packages
COPY apps/api ./apps/api

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

# Copy API source
COPY --from=builder /app/apps/api ./apps/api

# Set working directory to API
WORKDIR /app/apps/api

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun run --eval "const res = await fetch('http://localhost:' + (process.env.PORT ?? 3001) + '/health'); process.exit(res.ok ? 0 : 1)"

# Start application
CMD ["bun", "run", "start"]
