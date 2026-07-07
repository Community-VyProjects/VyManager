#!/usr/bin/env sh
set -e

echo "🚀 Starting VyManager Frontend..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
# until nc -z postgres 5432; do
#   echo "   PostgreSQL is unavailable - sleeping"
#   sleep 2
# done
echo "✅ PostgreSQL is ready!"

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Run database migrations (production-safe)
echo "🔄 Running database migrations..."
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations)" ]; then
  # Migrations exist - use migrate deploy (safe for production)
  echo "📋 Applying existing migrations..."

  # A failed migration must stop the container. Never mark migrations as
  # applied without running them: the schema Prisma believes in would diverge
  # from the real one, and every later migration builds on that lie. A
  # container that refuses to boot is recoverable; a database that
  # misrepresents its own schema is not.
  if ! npx prisma migrate deploy 2>&1; then
    echo ""
    echo "❌ Database migration failed - refusing to start."
    echo ""
    echo "   The database schema may be mid-migration. Inspect the state with:"
    echo "       npx prisma migrate status"
    echo "   and resolve the failed migration manually before restarting."
    echo "   See https://www.prisma.io/docs/orm/prisma-migrate/workflows/troubleshooting"
    echo ""
    exit 1
  fi
else
  # No migrations yet - this is the first deployment
  # Create initial migration from schema
  echo "📝 No migrations found - creating initial migration..."
  echo "⚠️  This should only happen on first deployment"

  # For first deployment, use db push to initialize
  npx prisma db push --accept-data-loss

  # Create a baseline migration for future updates
  echo "📝 Creating baseline migration..."
  MIGRATION_DIR="prisma/migrations/$(date +%Y%m%d%H%M%S)_init"
  mkdir -p "$MIGRATION_DIR"
  npx prisma migrate diff \
    --from-empty \
    --to-schema-datamodel prisma/schema.prisma \
    --script > "$MIGRATION_DIR/migration.sql" || true
fi

echo "✨ Starting Next.js..."
if [ "$VYMANAGER_ENV" = "development" ]; then
  echo "Running in development mode"
  exec npm run dev
else
  echo "Running in production mode"

  if [ ! -d ".next" ]; then
    echo "🏗️  No production build found, running next build..."
    npm run build
  else
    echo "✅ Production build already exists"
  fi

  exec npm start
fi