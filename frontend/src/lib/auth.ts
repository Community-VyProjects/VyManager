import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const authConfig: any = {
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET || "your-super-secret-key",
};

// Only set trustedOrigins in production
if (process.env.NODE_ENV === "production" && process.env.TRUSTED_ORIGINS) {
  authConfig.trustedOrigins = process.env.TRUSTED_ORIGINS.split(",").filter(Boolean);
}

export const auth = betterAuth(authConfig);
