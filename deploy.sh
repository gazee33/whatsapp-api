#!/bin/bash
set -e

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

# Build and push (or deploy directly)
echo "[1/3] Building Docker images..."
JWT_SECRET=$JWT_SECRET OPENCODE_API_KEY=$OPENCODE_API_KEY docker compose build --no-cache

echo "[2/3] Starting containers..."
JWT_SECRET=$JWT_SECRET OPENCODE_API_KEY=$OPENCODE_API_KEY docker compose up -d

echo "[3/3] Running database migration..."
docker compose exec backend npx prisma db push

echo ""
echo "Deploy complete!"
echo "  Frontend: https://nadil.cloud"
echo "  Backend:  https://api.nadil.cloud"
echo ""
echo "Check status: docker compose ps"
echo "View logs:    docker compose logs -f"
