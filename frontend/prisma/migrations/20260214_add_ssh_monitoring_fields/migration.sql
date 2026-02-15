-- AlterTable
ALTER TABLE "instances" ADD COLUMN "sshPort" INTEGER NOT NULL DEFAULT 22;
ALTER TABLE "instances" ADD COLUMN "sshUsername" TEXT;
ALTER TABLE "instances" ADD COLUMN "sshPublicKey" TEXT;
ALTER TABLE "instances" ADD COLUMN "sshEncryptedPrivKey" TEXT;
ALTER TABLE "instances" ADD COLUMN "sshKeyNonce" TEXT;
ALTER TABLE "instances" ADD COLUMN "sshKeyConfigured" BOOLEAN NOT NULL DEFAULT false;

-- AlterEnum
ALTER TYPE "FeatureGroup" ADD VALUE 'MONITORING';
