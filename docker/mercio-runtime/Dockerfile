FROM oven/bun:latest

WORKDIR /app

# Copy root manifests
COPY package.json bun.lock turbo.json bunfig.toml ./

# Copy every workspace package.json so bun can resolve the full workspace graph
# without needing the source files during install
COPY apps/api/package.json             ./apps/api/package.json
COPY apps/mercio-runtime/package.json  ./apps/mercio-runtime/package.json
COPY apps/web/package.json             ./apps/web/package.json
COPY apps/worker/package.json          ./apps/worker/package.json
COPY apps/ws/package.json              ./apps/ws/package.json
COPY packages/crypto/package.json      ./packages/crypto/package.json
COPY packages/db/package.json          ./packages/db/package.json
COPY packages/eslint-config/package.json    ./packages/eslint-config/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json
COPY packages/logger/package.json            ./packages/logger/package.json

# Install all dependencies — bun resolves and downloads the linux workerd binary here
RUN bun install

# Copy source for packages that mercio-runtime depends on
COPY packages ./packages
COPY apps/mercio-runtime ./apps/mercio-runtime

# Cache directory for deployed worker bundles
RUN mkdir -p /var/mercio

WORKDIR /app/apps/mercio-runtime

CMD ["bun", "run", "index.ts"]
