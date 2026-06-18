-- CreateTable
CREATE TABLE "firewall_separators" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "firewall_separators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "firewall_separators_instanceId_idx" ON "firewall_separators"("instanceId");

-- CreateIndex
CREATE INDEX "firewall_separators_instanceId_family_chain_idx" ON "firewall_separators"("instanceId", "family", "chain");
