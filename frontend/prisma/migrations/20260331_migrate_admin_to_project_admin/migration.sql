-- Migrate existing ADMIN users to PROJECT_ADMIN
-- This must be a separate migration because Postgres requires new enum values
-- to be committed before they can be used in DML statements.
UPDATE "users" SET "role" = 'PROJECT_ADMIN' WHERE "role" = 'ADMIN';
