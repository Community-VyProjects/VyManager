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

  # Try to apply migrations
  if ! npx prisma migrate deploy 2>&1; then
    # If deploy fails, it might be because the schema exists but migration isn't marked as applied
    echo "⚠️  Migration deployment failed - checking if schema needs baselining..."

    # Get the migration name (first directory in prisma/migrations)
    MIGRATION_NAME=$(ls prisma/migrations | head -n 1)

    if [ -n "$MIGRATION_NAME" ]; then
      echo "📌 Marking migration as already applied: $MIGRATION_NAME"
      npx prisma migrate resolve --applied "$MIGRATION_NAME" || true
    fi
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
  exec npm start
fi
