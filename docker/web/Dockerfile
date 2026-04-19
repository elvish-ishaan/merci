# Builder stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy monorepo root files
COPY package.json package-lock.json yarn.lock* pnpm-lock.yaml* bun.lockb* ./

# Copy workspace packages
COPY packages ./packages
COPY apps/web ./apps/web

# Install dependencies
RUN npm ci

# Build Next.js app
RUN cd apps/web && npm run build


# Runtime stage
FROM node:22-alpine

WORKDIR /app

# Create non-root user
#By default, containers run as root. If someone exploits your app, they'd have root access.
#Running as unprivileged user limits damage
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY --from=builder /app/package.json /app/package-lock.json* /app/yarn.lock* /app/pnpm-lock.yaml* /app/bun.lockb* ./

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy workspace packages
COPY --from=builder /app/packages ./packages

# Copy Next.js source and build output
COPY --from=builder /app/apps/web ./apps/web

# Set working directory to web app
WORKDIR /app/apps/web

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node --eval "fetch('http://localhost:3000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["/sbin/dumb-init", "--"]

# Start application
CMD ["npm", "start"]
