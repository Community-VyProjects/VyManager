-- CreateTable
CREATE TABLE "dashboard_layouts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "layout" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dashboard_layouts_userId_idx" ON "dashboard_layouts"("userId");

-- CreateIndex
CREATE INDEX "dashboard_layouts_instanceId_idx" ON "dashboard_layouts"("instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_layouts_userId_instanceId_key" ON "dashboard_layouts"("userId", "instanceId");
