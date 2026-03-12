#!/bin/sh
set -e

echo "🚀 Starting Invari..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."

# Parse DATABASE_URL if using docker-compose variables aren't set
if [ -z "$POSTGRES_USER" ] && [ -n "$DATABASE_URL" ]; then
  # Extract from DATABASE_URL: postgresql://user:pass@host:port/db
  POSTGRES_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
  POSTGRES_PASSWORD=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
  POSTGRES_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
  POSTGRES_DB=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
else
  # Use docker-compose default
  POSTGRES_HOST="${POSTGRES_HOST:-db}"
fi

until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping for 2 seconds..."
  sleep 2
done

echo "✅ PostgreSQL is ready!"

# Run database migrations
echo "📦 Running database migrations..."
cd /app/engine
pnpm db:migrate || {
  echo "⚠️  Migration failed!"
  exit 1
}

# Create default user if database is empty (optional, defaults to true)
if [ "$CREATE_DEFAULT_USER" != "false" ]; then
  echo "👤 Checking for default user..."
  pnpm db:create-default-user || echo "⚠️  Default user creation skipped or failed"
fi

# Seed database (optional, only on first run)
if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 Seeding database..."
  pnpm db:seed || echo "⚠️  Seeding failed or already seeded"
fi

# Start the application
echo "🎯 Starting Invari engine..."
cd /app/engine
exec pnpm start
