import { prismaAdapter } from "better-auth/adapters/prisma";

/**
 * PostgreSQL adapter with transactions on.
 *
 * The adapter default is off. runWithTransaction then commits each write
 * immediately, so a failed credential link leaves the user row and the
 * next create is rejected as a duplicate.
 */
export function createAuthPrismaAdapter(prisma: object) {
  return prismaAdapter(prisma as Parameters<typeof prismaAdapter>[0], {
    provider: "postgresql",
    transaction: true,
  });
}
