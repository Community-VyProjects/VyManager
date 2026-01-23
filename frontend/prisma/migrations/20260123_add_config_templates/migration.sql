-- Create enum for template categories
CREATE TYPE "TemplateCategory" AS ENUM ('FIREWALL', 'NAT', 'ROUTING', 'VPN', 'INTERFACE', 'SERVICE', 'OTHER');

-- Create config_templates table
CREATE TABLE "config_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "TemplateCategory" NOT NULL,
    "config" JSONB NOT NULL,
    "variables" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_templates_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "config_templates_category_idx" ON "config_templates"("category");
CREATE INDEX "config_templates_createdBy_idx" ON "config_templates"("createdBy");
CREATE INDEX "config_templates_isPublic_idx" ON "config_templates"("isPublic");
