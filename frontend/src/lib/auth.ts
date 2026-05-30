import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient, FeatureGroup } from "@prisma/client";
import {
  extractClaimValues,
  resolveRoleMapping,
  DEFAULT_GROUPS_CLAIM,
  type ProviderMappingConfig,
  type InstanceFeaturePermission,
  type ResolvedInstanceGrant,
} from "./sso-role-mapping";

const prisma = new PrismaClient();

// Marks UserInstanceRole rows that are managed by SSO group mapping, so the
// reconciler only ever adds/removes its own assignments and never deletes
// instance access an admin granted manually.
const SSO_ASSIGNED_BY = "sso";

const VALID_FEATURE_GROUPS = new Set<string>(Object.values(FeatureGroup));

// New users don't exist yet when mapProfileToUser runs, so their resolved
// instance grants are stashed by email and consumed in the user.create.after
// hook once the row exists. Keyed by email; entries are short-lived (set and
// consumed within the same login request).
const pendingInstanceGrants = new Map<string, ResolvedInstanceGrant[]>();

/**
 * Reconcile a user's SSO-managed instance assignments to exactly match the
 * resolved grants (issue #359, Phase 2). The IdP is authoritative: grants the
 * user no longer has are removed; granted instances are upserted with their
 * role and feature permissions. Manual (non-SSO) assignments are left intact
 * unless the same instance is also granted by SSO, in which case SSO wins.
 */
async function reconcileInstanceGrants(
  userId: string,
  grants: ResolvedInstanceGrant[],
): Promise<void> {
  const desiredByInstance = new Map(grants.map((g) => [g.instanceId, g]));

  // Only act on instances that still exist (avoids FK errors on stale rules).
  const existingInstances = desiredByInstance.size
    ? await prisma.instance.findMany({
        where: { id: { in: [...desiredByInstance.keys()] } },
        select: { id: true },
      })
    : [];
  const validInstanceIds = new Set(existingInstances.map((i) => i.id));

  // Remove SSO-managed assignments that are no longer desired.
  const ssoAssignments = await prisma.userInstanceRole.findMany({
    where: { userId, assignedBy: SSO_ASSIGNED_BY },
    select: { id: true, instanceId: true },
  });
  for (const assignment of ssoAssignments) {
    if (!validInstanceIds.has(assignment.instanceId)) {
      // Cascade deletes the assignment's UserFeaturePermission rows.
      await prisma.userInstanceRole.delete({ where: { id: assignment.id } });
    }
  }

  // Upsert each desired assignment and rebuild its feature permissions.
  for (const [instanceId, grant] of desiredByInstance) {
    if (!validInstanceIds.has(instanceId)) continue;

    const assignment = await prisma.userInstanceRole.upsert({
      where: { userId_instanceId: { userId, instanceId } },
      update: { role: grant.instanceRole, assignedBy: SSO_ASSIGNED_BY },
      create: {
        userId,
        instanceId,
        role: grant.instanceRole,
        assignedBy: SSO_ASSIGNED_BY,
      },
    });

    // Feature permissions only apply to OPERATOR/VIEWER; ADMIN = full access.
    await prisma.userFeaturePermission.deleteMany({
      where: { userInstanceRoleId: assignment.id },
    });
    if (grant.instanceRole !== "ADMIN" && grant.featurePermissions.length) {
      const valid = grant.featurePermissions.filter((fp) =>
        VALID_FEATURE_GROUPS.has(fp.feature),
      );
      if (valid.length) {
        await prisma.userFeaturePermission.createMany({
          data: valid.map((fp) => ({
            userInstanceRoleId: assignment.id,
            feature: fp.feature as FeatureGroup,
            canEdit: fp.canEdit,
            canView: fp.canView,
          })),
          skipDuplicates: true,
        });
      }
    }
  }
}

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

  // Runs on every OAuth login. Resolves the IdP claims, denies access when
  // mapping is enabled and no rule matches, and re-syncs both the site role and
  // instance assignments (the IdP is authoritative). Existing users are synced
  // inline; brand-new users (no row yet) have their instance grants stashed for
  // the user.create.after hook. Returned fields persist on user creation.
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

    const email = typeof profile.email === "string" ? profile.email : null;
    const existing = email
      ? await prisma.user.findUnique({ where: { email }, select: { id: true } })
      : null;

    if (existing) {
      if (resolved.siteRole) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { role: resolved.siteRole },
        });
      }
      await reconcileInstanceGrants(existing.id, resolved.instanceGrants);
    } else if (email && resolved.instanceGrants.length > 0) {
      // New user: reconcile once the row exists (see user.create.after).
      pendingInstanceGrants.set(email, resolved.instanceGrants);
    }

    return resolved.siteRole ? { role: resolved.siteRole } : {};
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
    databaseHooks: {
      user: {
        create: {
          // Brand-new SSO users have no row when mapProfileToUser runs, so their
          // resolved instance grants are reconciled here, once the row exists.
          after: async (user) => {
            const email = (user as { email?: string }).email;
            if (!email) return;
            const grants = pendingInstanceGrants.get(email);
            if (!grants) return;
            pendingInstanceGrants.delete(email);
            await reconcileInstanceGrants(user.id, grants);
          },
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
