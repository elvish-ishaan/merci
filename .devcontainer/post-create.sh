#!/usr/bin/env bash
set -euo pipefail

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " mercy devcontainer post-create setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Docker socket group fix ────────────────────────────────────────────────
# On Windows/WSL2 the socket's GID differs from the container's 'docker' group.
# We detect the actual GID and add the current user to a group with that GID.
echo "→ Configuring Docker socket access..."
DOCKER_SOCK_GID=$(stat -c '%g' /var/run/docker.sock 2>/dev/null || echo "")
if [ -n "$DOCKER_SOCK_GID" ] && [ "$DOCKER_SOCK_GID" != "0" ]; then
  if ! getent group "$DOCKER_SOCK_GID" > /dev/null 2>&1; then
    sudo groupadd --gid "$DOCKER_SOCK_GID" docker-host
  fi
  DOCKER_GROUP=$(getent group "$DOCKER_SOCK_GID" | cut -d: -f1)
  sudo usermod -aG "$DOCKER_GROUP" "$(whoami)"
  echo "  Added $(whoami) to group '$DOCKER_GROUP' (GID $DOCKER_SOCK_GID)"
else
  echo "  Docker socket is world-accessible or not found — skipping group fix"
fi

# ── 2. Install all monorepo dependencies ──────────────────────────────────────
echo "→ Installing dependencies (bun install)..."
bun install

# ── 3. Generate Prisma client ─────────────────────────────────────────────────
echo "→ Generating Prisma client..."
cd packages/db && bunx prisma generate && cd ../..

# ── 4. Bootstrap .env files ───────────────────────────────────────────────────
# Copies .env.devcontainer.example → .env (uses postgres/redis hostnames).
# Falls back to .env.example if no devcontainer-specific example exists.
# Never overwrites an existing .env.
copy_env() {
  local dir="$1"
  local dest="$dir/.env"

  if [ -f "$dest" ]; then
    echo "  $dest already exists — skipping"
    return
  fi

  if [ -f "$dir/.env.devcontainer.example" ]; then
    cp "$dir/.env.devcontainer.example" "$dest"
    echo "  Created $dest"
  elif [ -f "$dir/.env.example" ]; then
    cp "$dir/.env.example" "$dest"
    echo "  Created $dest (from .env.example — update DATABASE_URL and REDIS_HOST to use container hostnames)"
  else
    echo "  No .env.example found for $dir — skipping"
  fi
}

echo "→ Bootstrapping .env files..."
copy_env "apps/api"
copy_env "apps/web"
copy_env "apps/ws"
copy_env "apps/worker"
copy_env "apps/mercio-runtime"
copy_env "apps/mercob"
copy_env "packages/db"

# ── 5. Run database migrations ────────────────────────────────────────────────
# postgres is healthy by now (depends_on with healthcheck in docker-compose.yml).
# migrate deploy is non-interactive and idempotent — safe in automated contexts.
echo "→ Running database migrations..."
cd packages/db && bunx prisma migrate deploy && cd ../..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Setup complete!"
echo " Fill in secrets in each app's .env file,"
echo " then run 'bun dev' to start all services."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
