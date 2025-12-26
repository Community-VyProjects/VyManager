-- DropForeignKey
ALTER TABLE "permissions" DROP CONSTRAINT "permissions_siteId_fkey";

-- DropForeignKey
ALTER TABLE "permissions" DROP CONSTRAINT "permissions_userId_fkey";

-- DropTable
DROP TABLE "permissions";

-- DropEnum
DROP TYPE "SiteRole";
