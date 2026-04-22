# Builder stage
FROM oven/bun:latest AS builder

WORKDIR /app

# Copy monorepo root files
COPY package.json bun.lock turbo.json bunfig.toml ./

# Copy workspace packages
COPY packages ./packages
COPY apps/mercio-runtime ./apps/mercio-runtime

# Install dependencies
RUN bun install

# Generate the prisma client
RUN cd packages/db && bun run db:generate

# Build workspace packages
RUN cd packages && bun run build || true


# Runtime stage
FROM oven/bun:slim

WORKDIR /app

# Copy package.json and lock file
COPY --from=builder /app/package.json ./

# Copy built dependencies
COPY --from=builder /app/node_modules ./node_modules

# Copy workspace packages
COPY --from=builder /app/packages ./packages

# Copy mercio-runtime service source
COPY --from=builder /app/apps/mercio-runtime ./apps/mercio-runtime

# Create cache directory for worker bundles
RUN mkdir -p /var/mercio

# Set working directory to mercio-runtime
WORKDIR /app/apps/mercio-runtime

# Start mercio-runtime service
CMD ["bun", "run", "index.ts"]
