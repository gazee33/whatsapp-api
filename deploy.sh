#!/bin/bash
set -e

# Auto-load .env into shell environment
if [ -f backend/.env ]; then
  set -a; source backend/.env; set +a
elif [ -f .env ]; then
  set -a; source .env; set +a
fi

echo "=== Nadil AI — Deploy to VPS ==="
echo ""

# Check for required env vars
if [ -z "$OPENCODE_API_KEY" ]; then
  echo "Error: OPENCODE_API_KEY not set."
  echo "Export it or create a .env file:"
  echo "  export OPENCODE_API_KEY=sk-..."
  exit 1
fi

if [ -z "$JWT_SECRET" ]; then
  echo "Error: JWT_SECRET not set."
  echo "Generate one: openssl rand -hex 32"
  echo "  export JWT_SECRET=your-generated-secret"
  exit 1
fi

if [ -z "$DUALHOOK_API_KEY" ]; then
  echo "Error: DUALHOOK_API_KEY not set."
  echo "  export DUALHOOK_API_KEY=dh_live_xxx"
  exit 1
fi

if [ -z "$DUALHOOK_SIGNING_SECRET" ]; then
  echo "Error: DUALHOOK_SIGNING_SECRET not set."
  echo "  export DUALHOOK_SIGNING_SECRET=whsec_xxx"
  exit 1
fi

# Build and push (or deploy directly)
echo "[1/3] Building Docker images..."
docker compose build --no-cache

echo "[2/3] Starting containers..."
docker compose up -d

echo "[3/3] Running database migration..."
docker compose exec backend npx prisma db push

echo ""
echo "Deploy complete!"
echo "  Frontend: https://nadil.cloud"
echo "  Backend:  https://api.nadil.cloud"
echo ""
echo "Check status: docker compose ps"
echo "View logs:    docker compose logs -f"
