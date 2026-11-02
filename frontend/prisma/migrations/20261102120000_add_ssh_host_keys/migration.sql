CREATE TABLE "ssh_host_keys" (
    "instanceId" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "hostKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ssh_host_keys_pkey" PRIMARY KEY ("instanceId", "host", "port"),
    CONSTRAINT "ssh_host_keys_instanceId_fkey"
        FOREIGN KEY ("instanceId") REFERENCES "instances"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);
