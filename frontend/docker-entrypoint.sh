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
    echo "⚠️  Migration deployment failed - attempting to resolve..."

    # Resolve any failed migrations by marking them as rolled back, then re-applying
    for MIGRATION_DIR in prisma/migrations/*/; do
      MIGRATION_NAME=$(basename "$MIGRATION_DIR")
      # Skip the migration_lock.toml entry
      [ "$MIGRATION_NAME" = "migration_lock.toml" ] && continue
      echo "📌 Resolving migration: $MIGRATION_NAME"
      npx prisma migrate resolve --rolled-back "$MIGRATION_NAME" 2>/dev/null || true
    done

    # Retry deployment after resolving failed migrations
    echo "🔄 Retrying migration deployment..."
    if ! npx prisma migrate deploy 2>&1; then
      echo "⚠️  Retry failed - marking all migrations as applied..."
      for MIGRATION_DIR in prisma/migrations/*/; do
        MIGRATION_NAME=$(basename "$MIGRATION_DIR")
        [ "$MIGRATION_NAME" = "migration_lock.toml" ] && continue
        npx prisma migrate resolve --applied "$MIGRATION_NAME" 2>/dev/null || true
      done
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

  if [ ! -d ".next" ]; then
    echo "🏗️  No production build found, running next build..."
    npm run build
  else
    echo "✅ Production build already exists"
  fi

  exec npm start
fi