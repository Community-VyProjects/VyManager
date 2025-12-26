-- CreateEnum
CREATE TYPE "FeatureGroup" AS ENUM ('FIREWALL', 'NAT', 'DHCP', 'INTERFACES', 'STATIC_ROUTES', 'ROUTING_POLICIES', 'SYSTEM', 'CONFIGURATION', 'DASHBOARD', 'SITES_INSTANCES', 'USER_MANAGEMENT');

-- CreateEnum
CREATE TYPE "PermissionLevel" AS ENUM ('NONE', 'READ', 'WRITE');

-- CreateTable
CREATE TABLE "custom_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "custom_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "feature" "FeatureGroup" NOT NULL,
    "permission" "PermissionLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_instance_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "roleType" TEXT NOT NULL,
    "builtInRole" TEXT,
    "customRoleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assignedBy" TEXT NOT NULL,

    CONSTRAINT "user_instance_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "custom_roles_name_key" ON "custom_roles"("name");

-- CreateIndex
CREATE INDEX "feature_permissions_roleId_idx" ON "feature_permissions"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "feature_permissions_roleId_feature_key" ON "feature_permissions"("roleId", "feature");

-- CreateIndex
CREATE INDEX "user_instance_roles_userId_idx" ON "user_instance_roles"("userId");

-- CreateIndex
CREATE INDEX "user_instance_roles_instanceId_idx" ON "user_instance_roles"("instanceId");

-- CreateIndex
CREATE INDEX "user_instance_roles_customRoleId_idx" ON "user_instance_roles"("customRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "user_instance_roles_userId_instanceId_roleType_builtInRole__key" ON "user_instance_roles"("userId", "instanceId", "roleType", "builtInRole", "customRoleId");

-- AddForeignKey
ALTER TABLE "feature_permissions" ADD CONSTRAINT "feature_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "custom_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_instance_roles" ADD CONSTRAINT "user_instance_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_instance_roles" ADD CONSTRAINT "user_instance_roles_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_instance_roles" ADD CONSTRAINT "user_instance_roles_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "custom_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
