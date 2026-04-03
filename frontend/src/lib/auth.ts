import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const isProd = process.env.NODE_ENV === "production";

const trustedOrigins = process.env.TRUSTED_ORIGINS
  ? process.env.TRUSTED_ORIGINS.split(",").filter(Boolean)
  : ["http://localhost:3000"];

const authSecret = process.env.BETTER_AUTH_SECRET || (isProd ? "" : "dev-secret");
if (!authSecret) {
  throw new Error("BETTER_AUTH_SECRET must be set in production");
}

const secureCookies =
  process.env.BETTER_AUTH_SECURE_COOKIES === "true" && isProd;

// ---------------------------------------------------------------------------
// Async singleton — re-initializes automatically after config changes
// ---------------------------------------------------------------------------

let _authInstance: ReturnType<typeof betterAuth> | null = null;
let _initPromise: Promise<ReturnType<typeof betterAuth>> | null = null;

async function buildAuth() {
  // Load enabled OAuth providers from DB
  const providers = await prisma.oAuthProvider.findMany({
    where: { enabled: true },
  });

  const oauthConfig = providers.map((p) => ({
    providerId: p.providerId,
    clientId: p.clientId,
    clientSecret: p.clientSecret,
    ...(p.discoveryUrl ? { discoveryUrl: p.discoveryUrl } : {}),
    ...(p.authorizationUrl ? { authorizationUrl: p.authorizationUrl } : {}),
    ...(p.tokenUrl ? { tokenUrl: p.tokenUrl } : {}),
    ...(p.userInfoUrl ? { getUserInfo: undefined, userInfoUrl: p.userInfoUrl } : {}),
    scopes: p.scopes ? p.scopes.split(" ").filter(Boolean) : ["openid", "email", "profile"],
    pkce: p.pkce,
  }));

  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
    },
    baseURL:
      process.env.BETTER_AUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000",
    secret: authSecret,
    trustedOrigins: trustedOrigins,
    advanced: {
      useSecureCookies: secureCookies,
      crossSubDomainCookies: {
        enabled: false,
      },
    },
    plugins: [
      genericOAuth({
        config: oauthConfig,
      }),
    ],
  } as Parameters<typeof betterAuth>[0]);
}

export async function getAuth(): Promise<ReturnType<typeof betterAuth>> {
  if (_authInstance) return _authInstance;
  if (!_initPromise) {
    _initPromise = buildAuth().then((instance) => {
      _authInstance = instance;
      return instance;
    });
  }
  return _initPromise;
}

/** Call this after saving OAuth provider config so the next request re-initializes. */
export function invalidateAuth(): void {
  _authInstance = null;
  _initPromise = null;
}

// Eager-initialize at module load so the first request isn't slow.
// Errors are non-fatal here — they'll surface on the first actual request.
getAuth().catch((err) => {
  console.error("[auth] Failed to initialize better-auth:", err);
});
