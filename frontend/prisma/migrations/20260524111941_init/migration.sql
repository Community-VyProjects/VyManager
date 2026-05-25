/*
  Warnings:

  - The values [STATIC_ROUTES,ROUTING_POLICIES,SYSTEM,CONFIGURATION,DASHBOARD,SITES_INSTANCES,USER_MANAGEMENT] on the enum `FeatureGroup` will be removed. If these variants are still used in the database, this will fail.
  - The values [SUPER_ADMIN,NETWORK_ADMIN,OPERATOR] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - Changed the type of `feature` on the `user_feature_permissions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FeatureGroup_new" AS ENUM ('FIREWALL', 'INTERFACES', 'DHCP', 'NAT', 'MONITORING', 'SSH_CONSOLE');
ALTER TABLE "user_feature_permissions" ALTER COLUMN "feature" TYPE "FeatureGroup_new" USING ("feature"::text::"FeatureGroup_new");
ALTER TYPE "FeatureGroup" RENAME TO "FeatureGroup_old";
ALTER TYPE "FeatureGroup_new" RENAME TO "FeatureGroup";
DROP TYPE "public"."FeatureGroup_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'VIEWER');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TABLE "role_permissions" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'VIEWER';
COMMIT;

-- AlterTable
ALTER TABLE "oauth_providers" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_feature_permissions" DROP COLUMN "feature",
ADD COLUMN     "feature" "FeatureGroup" NOT NULL;

-- DropEnum
DROP TYPE "PermissionLevel";

-- CreateIndex
CREATE UNIQUE INDEX "user_feature_permissions_userInstanceRoleId_feature_key" ON "user_feature_permissions"("userInstanceRoleId", "feature");
