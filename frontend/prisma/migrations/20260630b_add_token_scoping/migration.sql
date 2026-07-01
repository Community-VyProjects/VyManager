-- Least-privilege scoping for API tokens: restrict a token to specific
-- instances/sites (empty = every instance the user has a grant on).

ALTER TABLE "api_tokens"
  ADD COLUMN IF NOT EXISTS "allowedInstanceIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "allowedSiteIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
