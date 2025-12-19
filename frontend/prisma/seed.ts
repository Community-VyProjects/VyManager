/**
 * Prisma Seed Script for Multi-Instance Support
 *
 * This script initializes the database with:
 * 1. A default site
 * 2. A default instance (using existing VyOS device from backend .env)
 * 3. Permissions for all existing users
 */

import { PrismaClient, SiteRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // ========================================================================
  // 1. Create Default Site
  // ========================================================================

  console.log("📍 Creating default site...");

  const site = await prisma.site.upsert({
    where: { name: "Default Site" },
    update: {},
    create: {
      name: "Default Site",
      description: "Default site for existing VyOS instance",
    },
  });

  console.log(`✓ Site created: ${site.name} (${site.id})`);

  // ========================================================================
  // 2. Create Default Instance
  // ========================================================================

  console.log("🖥️  Creating default instance...");

  // These values come from backend/.env - VYOS_* variables
  // In production, you might want to read these from environment variables
  const instance = await prisma.instance.upsert({
    where: {
      siteId_name: {
        siteId: site.id,
        name: "vyos15",
      },
    },
    update: {},
    create: {
      siteId: site.id,
      name: "vyos15",
      description: "Primary VyOS router (migrated from single-instance)",
      host: "100.64.64.2",
      port: 443,
      username: "api", // VyOS API uses API key, not username/password
      password: "d7777309f3873989672300ca4f75e1069ac405accfe1c7262d6f4fe01345b13e", // This is actually the API key
      apiKey: "d7777309f3873989672300ca4f75e1069ac405accfe1c7262d6f4fe01345b13e",
      isActive: true,
    },
  });

  console.log(`✓ Instance created: ${instance.name} at ${instance.host}:${instance.port}`);

  // ========================================================================
  // 3. Grant Permissions to All Existing Users
  // ========================================================================

  console.log("👥 Granting permissions to existing users...");

  const users = await prisma.user.findMany();

  if (users.length === 0) {
    console.log("⚠️  No users found. Please create a user first via sign up.");
  } else {
    for (const user of users) {
      const permission = await prisma.permission.upsert({
        where: {
          userId_siteId: {
            userId: user.id,
            siteId: site.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          siteId: site.id,
          role: SiteRole.OWNER, // Grant OWNER role to all existing users
        },
      });

      console.log(`✓ Permission granted: ${user.email} -> ${site.name} (${permission.role})`);
    }
  }

  // ========================================================================
  // Summary
  // ========================================================================

  console.log("\n✅ Seed completed successfully!");
  console.log("\nSummary:");
  console.log(`- Sites: 1 (${site.name})`);
  console.log(`- Instances: 1 (${instance.name} at ${instance.host})`);
  console.log(`- Permissions: ${users.length} users granted OWNER access`);
  console.log("\nNext steps:");
  console.log("1. Implement Phase 2: Backend Session Management");
  console.log("2. Implement Phase 3: Site Manager UI");
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
