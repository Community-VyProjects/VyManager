import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import {
  extractClaimValues,
  resolveRoleMapping,
  DEFAULT_GROUPS_CLAIM,
  type ProviderMappingConfig,
  type InstanceFeaturePermission,
} from "./sso-role-mapping";

const prisma = new PrismaClient();

// Better Auth's genericOAuth types mapProfileToUser against the base user shape,
// which doesn't include our `role` additionalField. This derives the plugin's
// own config type so we can cast the mapper without a fragile named import.
type GenericOAuthProviderConfig = NonNullable<
  Parameters<typeof genericOAuth>[0]["config"]
>[number];

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

  // Load SSO role-mapping rules for those providers (issue #359) and index them
  // by providerId so the login hook can resolve roles from IdP claims.
  const mappingRows = providers.length
    ? await prisma.oAuthRoleMapping.findMany({
        where: { providerId: { in: providers.map((p) => p.providerId) } },
      })
    : [];

  const mappingByProvider = new Map<string, ProviderMappingConfig>();
  for (const p of providers) {
    mappingByProvider.set(p.providerId, {
      enabled: p.roleMappingEnabled,
      groupsClaim: p.groupsClaim || DEFAULT_GROUPS_CLAIM,
      rules: mappingRows
        .filter((m) => m.providerId === p.providerId)
        .map((m) => ({
          claimValue: m.claimValue,
          siteRole: m.siteRole,
          instanceId: m.instanceId,
          instanceRole: m.instanceRole,
          featurePermissions:
            (m.featurePermissions as InstanceFeaturePermission[] | null) ?? null,
          priority: m.priority,
        })),
    });
  }

  // Runs on every OAuth login. Resolves the IdP claims to a site role, denies
  // access when mapping is enabled and no rule matches, and re-syncs the role
  // for existing users (the IdP is authoritative). Instance-role reconciliation
  // is handled in Phase 2. Returning fields persists them on user creation.
  async function applyRoleMapping(
    providerId: string,
    profile: Record<string, unknown>,
  ): Promise<{ role?: string }> {
    const cfg = mappingByProvider.get(providerId);
    if (!cfg || !cfg.enabled) return {};

    const claims = extractClaimValues(profile, cfg.groupsClaim);
    const resolved = resolveRoleMapping(cfg, claims);

    if (resolved.denied) {
      // Throwing aborts the OAuth sign-in flow -> login denied.
      throw new Error(
        "Access denied: your account is not a member of any group permitted to access VyManager.",
      );
    }

    if (resolved.siteRole) {
      const email = typeof profile.email === "string" ? profile.email : null;
      if (email) {
        // No-op for first-time users (created with the returned role below).
        await prisma.user.updateMany({
          where: { email },
          data: { role: resolved.siteRole },
        });
      }
      return { role: resolved.siteRole };
    }
    return {};
  }

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
    // Cast: the returned `role` is a declared additionalField, persisted at
    // runtime, but absent from the plugin's base-user return type.
    mapProfileToUser: ((profile: Record<string, unknown>) =>
      applyRoleMapping(p.providerId, profile)) as unknown as
      GenericOAuthProviderConfig["mapProfileToUser"],
  }));

  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    user: {
      // Declares the existing `role` column to Better Auth so the SSO role
      // mapping (issue #359) can persist it via mapProfileToUser. `input: false`
      // keeps it out of self-service sign-up payloads.
      additionalFields: {
        role: {
          type: "string",
          required: false,
          input: false,
          defaultValue: "VIEWER",
        },
      },
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
