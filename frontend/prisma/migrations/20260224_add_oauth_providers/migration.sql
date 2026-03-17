-- CreateTable
CREATE TABLE IF NOT EXISTS "oauth_providers" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "discoveryUrl" TEXT,
    "authorizationUrl" TEXT,
    "tokenUrl" TEXT,
    "userInfoUrl" TEXT,
    "scopes" TEXT,
    "pkce" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_providers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "oauth_providers_providerId_key" ON "oauth_providers"("providerId");
