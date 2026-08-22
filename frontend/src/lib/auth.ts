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
  type ResolvedInstanceGrant,
  type ResolvedSiteGrant,
} from "./sso-role-mapping";

const prisma = new PrismaClient();

// New users don't exist yet when mapProfileToUser runs, so their resolved
// grants are stashed by email and consumed in the user.create.after hook once
// the row exists. Keyed by email; entries are short-lived (set and consumed
// within the same login request).
const pendingGrants = new Map<
  string,
  { instanceGrants: ResolvedInstanceGrant[]; siteGrants: ResolvedSiteGrant[] }
>();

/**
 * Notify the backend to reconcile a user's SSO-managed grants (Golden Rule,
 * RFC 3.3). The frontend is banned from writing authorization tables
 * (user_instance_roles / user_feature_permissions); it no longer computes or
 * writes grants here. It only tells the backend that an SSO login happened,
 * by user reference. The backend re-derives the IdP claims from the user's
 * stored account token — never from anything the frontend asserts — and
 * applies oauth_role_mappings itself.
 *
 * TIMING (verify on a live IdP before merge): the backend reads the stored
 * account id_token, so this notification must fire AFTER Better Auth has
 * persisted the fresh token for this login. If a reconcile lags one login,
 * move this call to an account.create/update after-hook.
 */
async function reconcileGrants(userId: string): Promise<void> {
  const backendUrl = process.env.BACKEND_URL;
  const secret =
    process.env.INTERNAL_API_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!backendUrl || !secret) {
    console.error(
      "[SSO] BACKEND_URL / internal secret missing; cannot reconcile grants",
    );
    return;
  }
  try {
    const res = await fetch(`${backendUrl.replace(/\/$/, "")}/internal/sso-reconcile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Auth": secret,
      },
      body: JSON.stringify({ user_id: userId }),
    });
    if (!res.ok) {
      console.error(`[SSO] backend reconcile failed: ${res.status}`);
    }
  } catch (e) {
    console.error("[SSO] backend reconcile request error:", e);
  }
}

// Better Auth's genericOAuth types mapProfileToUser against the base user shape,
// which doesn't include our `role` additionalField. This derives the plugin's
// own config type so we can cast the mapper without a fragile named import.
type GenericOAuthProviderConfig = NonNullable<
  Parameters<typeof genericOAuth>[0]["config"]
>[number];

/**
 * Decode a JWT payload WITHOUT verifying its signature.
 *
 * We only use these claims for the frontend deny-gate (does this login match a
 * permitted group?). The authoritative, security-sensitive read happens in the
 * backend /internal/sso-reconcile, which re-verifies the stored id_token against
 * the provider JWKS before trusting its groups. Here we just need the claim
 * values, and the id_token was handed to us directly over the back-channel token
 * exchange, so no untrusted party sat in between.
 */
function decodeJwtClaims(
  token: string | undefined | null,
): Record<string, unknown> | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(payload, "base64").toString("utf8");
    const parsed = JSON.parse(json);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

// OIDC discovery cache: discoveryUrl -> userinfo_endpoint (or null if the doc
// has none / the fetch failed). Populated lazily on first login per provider.
const discoveredUserInfoUrls = new Map<string, string | null>();

async function resolveUserInfoUrl(
  userInfoUrl: string | null,
  discoveryUrl: string | null,
): Promise<string | null> {
  if (userInfoUrl) return userInfoUrl;
  if (!discoveryUrl) return null;
  if (discoveredUserInfoUrls.has(discoveryUrl)) {
    return discoveredUserInfoUrls.get(discoveryUrl) ?? null;
  }
  let endpoint: string | null = null;
  try {
    const res = await fetch(discoveryUrl);
    if (res.ok) {
      const doc = (await res.json()) as { userinfo_endpoint?: string };
      endpoint = doc.userinfo_endpoint ?? null;
    }
  } catch (e) {
    console.error("[SSO] OIDC discovery fetch failed:", e);
  }
  discoveredUserInfoUrls.set(discoveryUrl, endpoint);
  return endpoint;
}

type OAuthTokensLike = {
  idToken?: string | null;
  accessToken?: string | null;
};

/**
 * Custom getUserInfo that preserves the FULL id_token claim set.
 *
 * Better Auth's default getUserInfo decodes the id_token but reduces it to a
 * fixed whitelist (sub/email/email_verified/name/picture), silently dropping
 * `groups`. Some IdPs (notably Microsoft Entra) emit group claims ONLY in the
 * id_token and never via the /userinfo endpoint, so the default profile arrives
 * with no groups and the role-mapping deny-gate rejects every Entra login even
 * when the user is in a permitted group. (Authentik works because it returns
 * groups from /userinfo.)
 *
 * We therefore: keep every id_token claim (so `groups` survives), and backfill
 * from /userinfo for providers that keep identity fields out of the id_token.
 */
function buildGetUserInfo(userInfoUrl: string | null, discoveryUrl: string | null) {
  return async (tokens: OAuthTokensLike): Promise<Record<string, unknown> | null> => {
    const idClaims = decodeJwtClaims(tokens.idToken);

    let userInfo: Record<string, unknown> | null = null;
    const url = await resolveUserInfoUrl(userInfoUrl, discoveryUrl);
    if (url && tokens.accessToken) {
      try {
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            Accept: "application/json",
          },
        });
        if (res.ok) userInfo = (await res.json()) as Record<string, unknown>;
      } catch (e) {
        console.error("[SSO] userinfo fetch failed:", e);
      }
    }

    if (!idClaims && !userInfo) return null;

    // id_token claims win over /userinfo: they carry the group claim Entra only
    // exposes there and hold the authoritative sub/email. /userinfo backfills
    // any fields a provider leaves out of the id_token.
    const claims = { ...(userInfo ?? {}), ...(idClaims ?? {}) };

    // Normalize the standard identity fields Better Auth consumes, while keeping
    // every raw claim (incl. `groups`) for mapProfileToUser/applyRoleMapping.
    return {
      ...claims,
      id: claims.sub ?? claims.id,
      email: claims.email,
      emailVerified: claims.email_verified ?? false,
      name: claims.name ?? claims.preferred_username ?? claims.email,
      image: claims.picture ?? claims.image,
    };
  };
}

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
      // users.role is backend-owned: /internal/sso-reconcile re-derives the
      // claims from the stored account token and applies the site role
      // itself. Writing it here too would keep the frontend DB role needing
      // UPDATE on users.role — the exact privilege the Golden Rule wants
      // revoked (a compromised frontend could self-promote to ADMIN).
      await reconcileGrants(existing.id);
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
    ...(p.userInfoUrl ? { userInfoUrl: p.userInfoUrl } : {}),
    scopes: p.scopes ? p.scopes.split(" ").filter(Boolean) : ["openid", "email", "profile"],
    pkce: p.pkce,
    // Override profile fetching so group claims that live only in the id_token
    // (e.g. Microsoft Entra) survive into mapProfileToUser. See buildGetUserInfo.
    getUserInfo: buildGetUserInfo(p.userInfoUrl, p.discoveryUrl) as unknown as
      GenericOAuthProviderConfig["getUserInfo"],
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
          // The very first user (onboarding) is promoted to ADMIN as part of
          // creation, so there is no window where the first account exists as a
          // powerless VIEWER. Later users keep the default role; post-onboarding
          // sign-up is blocked by the auth route gate.
          before: async (user) => {
            const userCount = await prisma.user.count();
            if (userCount === 0) {
              return { data: { ...user, role: "ADMIN" } };
            }
          },
          // Brand-new SSO users have no row when mapProfileToUser runs, so their
          // resolved instance grants are reconciled here, once the row exists.
          after: async (user) => {
            const email = (user as { email?: string }).email;
            if (!email) return;
            const grants = pendingGrants.get(email);
            if (!grants) return;
            pendingGrants.delete(email);
            await reconcileGrants(user.id);
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
