-- AlterTable
ALTER TABLE "instances" ADD COLUMN IF NOT EXISTS "commitConfirmEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "instances" ADD COLUMN IF NOT EXISTS "commitConfirmMinutes" INTEGER NOT NULL DEFAULT 5;
