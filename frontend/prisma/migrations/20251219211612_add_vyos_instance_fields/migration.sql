-- AlterTable
ALTER TABLE "active_sessions" ADD COLUMN     "sessionToken" TEXT;

-- AlterTable
ALTER TABLE "instances" ADD COLUMN     "protocol" TEXT NOT NULL DEFAULT 'https',
ADD COLUMN     "verifySsl" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vyosVersion" TEXT;
