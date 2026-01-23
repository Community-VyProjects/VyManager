-- Migration: Add OPERATOR to InstanceRole enum
-- Note: This was added manually to the database, this migration documents it

-- AlterEnum
ALTER TYPE "InstanceRole" ADD VALUE IF NOT EXISTS 'OPERATOR';
