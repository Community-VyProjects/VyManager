import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient, type InstanceRole } from "@prisma/client";
import {
  extractClaimValues,
  resolveRoleMapping,
  DEFAULT_GROUPS_CLAIM,
  type ProviderMappingConfig,
  type InstanceFeaturePermission,
  type ResolvedInstanceGrant,
  type ResolvedSiteGrant,
} from "./sso-role-mapping";

const prisma = new PrismaClient();

// Marks UserInstanceRole rows that are managed by SSO group mapping, so the
// reconciler only ever adds/removes its own assignments and never deletes
// instance access an admin granted manually.
const SSO_ASSIGNED_BY = "sso";

// New users don't exist yet when mapProfileToUser runs, so their resolved
// grants are stashed by email and consumed in the user.create.after hook once
// the row exists. Keyed by email; entries are short-lived (set and consumed
// within the same login request).
const pendingGrants = new Map<
  string,
  { instanceGrants: ResolvedInstanceGrant[]; siteGrants: ResolvedSiteGrant[] }
>();

// Most-privileged role wins when an instance is granted more than once (e.g. via
// a whole-site grant plus an explicit instance grant).
const INSTANCE_ROLE_RANK: Record<string, number> = {
  ADMIN: 3,
  OPERATOR: 2,
  EDITOR: 2,
  VIEWER: 1,
};

function mergePerms(
  base: InstanceFeaturePermission[],
  extra: InstanceFeaturePermission[],
): InstanceFeaturePermission[] {
  const byFeature = new Map<string, InstanceFeaturePermission>();
  for (const p of [...base, ...extra]) {
    const ex = byFeature.get(p.feature);
    if (!ex) byFeature.set(p.feature, { ...p });
    else {
      ex.canEdit = ex.canEdit || p.canEdit;
      ex.canView = ex.canView || p.canView;
    }
  }
  return Array.from(byFeature.values());
}

interface DesiredGrant {
  instanceRole: InstanceRole;
  featurePermissions: InstanceFeaturePermission[];
}

/**
 * Reconcile a user's SSO-managed instance assignments (issue #359). Site grants
 * are expanded to every instance in the site, then explicit instance grants are
 * merged on top (most-privileged role + union of feature permissions). The IdP
 * is authoritative: SSO-managed rows not in the desired set are removed. Manual
 * (non-SSO) assignments are left intact unless SSO also grants that instance.
 */
async function reconcileGrants(
  userId: string,
  instanceGrants: ResolvedInstanceGrant[],
  siteGrants: ResolvedSiteGrant[],
): Promise<void> {
  const desired = new Map<string, DesiredGrant>();
  const add = (
    instanceId: string,
    role: InstanceRole,
    perms: InstanceFeaturePermission[],
  ) => {
    const ex = desired.get(instanceId);
    if (!ex) {
      desired.set(instanceId, { instanceRole: role, featurePermissions: mergePerms([], perms) });
      return;
    }
    if ((INSTANCE_ROLE_RANK[role] ?? 0) > (INSTANCE_ROLE_RANK[ex.instanceRole] ?? 0)) {
      ex.instanceRole = role;
    }
    ex.featurePermissions = mergePerms(ex.featurePermissions, perms);
  };

  // Expand whole-site grants to each instance in the site.
  if (siteGrants.length) {
    const bySite = new Map(siteGrants.map((g) => [g.siteId, g]));
    const instances = await prisma.instance.findMany({
      where: { siteId: { in: [...bySite.keys()] } },
      select: { id: true, siteId: true },
    });
    for (const inst of instances) {
      const g = bySite.get(inst.siteId);
      if (g) add(inst.id, g.instanceRole, g.featurePermissions);
    }
  }
  for (const g of instanceGrants) add(g.instanceId, g.instanceRole, g.featurePermissions);

  // Only act on instances that still exist (avoids FK errors on stale rules).
  const validInstanceIds = new Set<string>();
  if (desired.size) {
    const rows = await prisma.instance.findMany({
      where: { id: { in: [...desired.keys()] } },
      select: { id: true },
    });
    for (const r of rows) validInstanceIds.add(r.id);
  }

  // Remove SSO-managed assignments no longer desired (validInstanceIds is the
  // intersection of desired and existing).
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
  for (const [instanceId, grant] of desired) {
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
      // `feature` is a free-text column; values come from the frontend
      // FeatureGroup taxonomy and are validated by the UI / API, not here.
      await prisma.userFeaturePermission.createMany({
        data: grant.featurePermissions.map((fp) => ({
          userInstanceRoleId: assignment.id,
          feature: fp.feature,
          canEdit: fp.canEdit,
          canView: fp.canView,
        })),
        skipDuplicates: true,
      });
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
          siteId: m.siteId,
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
      await reconcileGrants(existing.id, resolved.instanceGrants, resolved.siteGrants);
    } else if (
      email &&
      (resolved.instanceGrants.length > 0 || resolved.siteGrants.length > 0)
    ) {
      // New user: reconcile once the row exists (see user.create.after).
      pendingGrants.set(email, {
        instanceGrants: resolved.instanceGrants,
        siteGrants: resolved.siteGrants,
      });
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
            const grants = pendingGrants.get(email);
            if (!grants) return;
            pendingGrants.delete(email);
            await reconcileGrants(user.id, grants.instanceGrants, grants.siteGrants);
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
