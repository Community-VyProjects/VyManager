-- AlterTable
ALTER TABLE "instances" ADD COLUMN "commitConfirmEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "instances" ADD COLUMN "commitConfirmMinutes" INTEGER NOT NULL DEFAULT 5;
