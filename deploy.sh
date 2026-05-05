#!/bin/bash
set -e

echo "=== Nadil AI — Deploy to VPS ==="
echo ""

# Check for required env var
if [ -z "$OPENCODE_API_KEY" ]; then
  echo "Error: OPENCODE_API_KEY not set."
  echo "Export it or create a .env file:"
  echo "  export OPENCODE_API_KEY=sk-..."
  exit 1
fi

# Build and push (or deploy directly)
echo "[1/3] Building Docker images..."
OPENCODE_API_KEY=$OPENCODE_API_KEY docker compose build --no-cache

echo "[2/3] Starting containers..."
OPENCODE_API_KEY=$OPENCODE_API_KEY docker compose up -d

echo "[3/3] Running database migration..."
docker compose exec backend npx prisma db push

echo ""
echo "Deploy complete!"
echo "  Frontend: https://nadil.claude"
echo "  Backend:  https://api.nadil.claude"
echo ""
echo "Check status: docker compose ps"
echo "View logs:    docker compose logs -f"
