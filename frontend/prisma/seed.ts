/**
 * Prisma Seed Script for Multi-Instance Support
 *
 * This script initializes the database with:
 * 1. A default site
 * 2. A default instance (using existing VyOS device from backend .env)
 * 3. Permissions for all existing users
 */

import { PrismaClient, Role } from "@prisma/client";

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
  // 3. Grant Instance Access to All Existing Users
  // ========================================================================

  console.log("👥 Granting instance access to existing users...");

  const users = await prisma.user.findMany();

  if (users.length === 0) {
    console.log("⚠️  No users found. Please create a user first via sign up.");
  } else {
    for (const user of users) {
      // First user becomes SUPER_ADMIN, rest become ADMIN
      const isFirstUser = user === users[0];
      const roleToAssign = isFirstUser ? "SUPER_ADMIN" : "ADMIN";

      // Update user's global role
      await prisma.user.update({
        where: { id: user.id },
        data: { role: roleToAssign as Role },
      });

      // Grant instance access with built-in role
      const instanceRole = await prisma.userInstanceRole.upsert({
        where: {
          userId_instanceId_roleType_builtInRole_customRoleId: {
            userId: user.id,
            instanceId: instance.id,
            roleType: "BUILT_IN",
            builtInRole: roleToAssign,
            customRoleId: null as any, // Prisma requires null in composite unique key
          },
        },
        update: {},
        create: {
          userId: user.id,
          instanceId: instance.id,
          roleType: "BUILT_IN",
          builtInRole: roleToAssign,
          assignedBy: user.id, // Self-assigned during migration
          // customRoleId is omitted (null) for built-in roles
        },
      });

      console.log(`✓ Access granted: ${user.email} -> ${instance.name} (${roleToAssign})`);
    }
  }

  // ========================================================================
  // Summary
  // ========================================================================

  console.log("\n✅ Seed completed successfully!");
  console.log("\nSummary:");
  console.log(`- Sites: 1 (${site.name})`);
  console.log(`- Instances: 1 (${instance.name} at ${instance.host})`);
  console.log(`- Instance Access: ${users.length} users granted access`);
  console.log("\nNext steps:");
  console.log("1. Users can now connect to the instance from Site Manager");
  console.log("2. First user has SUPER_ADMIN role, others have ADMIN role");
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
