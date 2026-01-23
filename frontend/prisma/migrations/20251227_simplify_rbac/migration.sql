-- Migration: Simplify RBAC to Two-Tier System
-- Site-level: ADMIN, VIEWER
-- Instance-level: ADMIN, EDITOR, VIEWER

-- ============================================================================
-- Step 1: Create new InstanceRole enum
-- ============================================================================
CREATE TYPE "InstanceRole" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- ============================================================================
-- Step 2: Create UserFeaturePermission table
-- ============================================================================
CREATE TABLE "user_feature_permissions" (
    "id" TEXT NOT NULL,
    "userInstanceRoleId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "canView" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_feature_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_feature_permissions_userInstanceRoleId_feature_key" ON "user_feature_permissions"("userInstanceRoleId", "feature");
CREATE INDEX "user_feature_permissions_userInstanceRoleId_idx" ON "user_feature_permissions"("userInstanceRoleId");

-- ============================================================================
-- Step 3: Update FeatureGroup enum (remove unused values)
-- ============================================================================
-- Note: We'll keep all existing enum values for now to avoid breaking existing data
-- The schema will only use FIREWALL, INTERFACES, DHCP, NAT going forward

-- ============================================================================
-- Step 4: Backup and migrate UserInstanceRole table
-- ============================================================================

-- Add new role column (temporary)
ALTER TABLE "user_instance_roles" ADD COLUMN "role" "InstanceRole";

-- Migrate existing data:
-- Convert builtInRole to new role column
UPDATE "user_instance_roles"
SET "role" = CASE
    WHEN "builtInRole" IN ('SUPER_ADMIN', 'ADMIN') THEN 'ADMIN'::"InstanceRole"
    WHEN "builtInRole" = 'VIEWER' THEN 'VIEWER'::"InstanceRole"
    ELSE 'VIEWER'::"InstanceRole"  -- Default fallback
END
WHERE "roleType" = 'BUILT_IN';

-- For custom roles, set to EDITOR by default (can be adjusted manually later)
UPDATE "user_instance_roles"
SET "role" = 'EDITOR'::"InstanceRole"
WHERE "roleType" = 'CUSTOM';

-- Make role column NOT NULL
ALTER TABLE "user_instance_roles" ALTER COLUMN "role" SET NOT NULL;

-- Drop old columns
ALTER TABLE "user_instance_roles" DROP COLUMN "roleType";
ALTER TABLE "user_instance_roles" DROP COLUMN "builtInRole";
ALTER TABLE "user_instance_roles" DROP COLUMN "customRoleId";

-- Update unique constraint
ALTER TABLE "user_instance_roles" DROP CONSTRAINT IF EXISTS "user_instance_roles_userId_instanceId_roleType_builtInRole_key";
CREATE UNIQUE INDEX "user_instance_roles_userId_instanceId_key" ON "user_instance_roles"("userId", "instanceId");

-- ============================================================================
-- Step 5: Update Site-level Role enum
-- ============================================================================

-- Convert existing user roles
UPDATE users
SET role = 'ADMIN'
WHERE role IN ('SUPER_ADMIN', 'NETWORK_ADMIN', 'OPERATOR');

-- VIEWER stays as VIEWER (no change needed)

-- Note: The actual enum type change will be handled by Prisma's migration
-- We just need to ensure the data is compatible

-- ============================================================================
-- Step 6: Add foreign key for UserFeaturePermission
-- ============================================================================
ALTER TABLE "user_feature_permissions" ADD CONSTRAINT "user_feature_permissions_userInstanceRoleId_fkey"
    FOREIGN KEY ("userInstanceRoleId") REFERENCES "user_instance_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
