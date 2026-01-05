-- Migration: Drop custom_roles and feature_permissions tables
-- These tables were part of the old RBAC system and are no longer used

-- Drop feature_permissions first (has foreign key to custom_roles)
DROP TABLE IF EXISTS "feature_permissions" CASCADE;

-- Drop custom_roles
DROP TABLE IF EXISTS "custom_roles" CASCADE;
