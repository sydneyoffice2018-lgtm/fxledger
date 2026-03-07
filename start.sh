#!/bin/bash
echo "🚀 Starting FX Ledger..."

# Check if postgres is running, if not try to start it
if ! pg_isready -q 2>/dev/null; then
  echo "Starting PostgreSQL..."
  pg_ctlcluster 16 main start 2>/dev/null || \
  pg_ctlcluster 15 main start 2>/dev/null || \
  brew services start postgresql 2>/dev/null || \
  true
  sleep 2
fi

# Create DB if it doesn't exist
createdb fxledger 2>/dev/null || true

export DATABASE_URL="${DATABASE_URL:-postgresql://$(whoami)@localhost:5432/fxledger}"
export SESSION_SECRET="${SESSION_SECRET:-fx-ledger-secret-$(date +%s)}"
export NODE_ENV=production
export PORT="${PORT:-3001}"

echo "📦 Building frontend..."
npm run build

echo "✅ Starting server on http://localhost:$PORT"
echo "🔑 Login: admin / admin123"
node --import tsx/esm server/index.ts
