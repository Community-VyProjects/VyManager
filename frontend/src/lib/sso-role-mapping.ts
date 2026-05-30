// SSO Group/Role Mapping resolver (issue #359)
//
// Pure, side-effect-free logic for turning IdP claims into VyManager roles.
// Kept separate from auth.ts so it can be unit-tested without Better Auth or a
// database. The auth layer is responsible for loading mapping rules from the DB
// and for persisting the resolved roles.
//
// Decisions (locked with maintainer):
//   - Claims map to BOTH site-level Role and per-instance roles.
//   - Roles are re-evaluated on EVERY login (the IdP is authoritative).
//   - A user whose claims match no rule is DENIED access.

import type { Role, InstanceRole } from "@prisma/client";

/** One mapping rule (mirrors a row in the oauth_role_mappings table). */
export interface RoleMappingRule {
  claimValue: string;
  siteRole: Role | null;
  // A grant targets one instance (instanceId) or a whole site (siteId), with
  // instanceRole + featurePermissions. A pure site-role rule leaves both null.
  instanceId: string | null;
  siteId: string | null;
  instanceRole: InstanceRole | null;
  featurePermissions: InstanceFeaturePermission[] | null;
  priority: number;
}

export interface InstanceFeaturePermission {
  feature: string;
  canEdit: boolean;
  canView: boolean;
}

/** A provider's complete mapping configuration. */
export interface ProviderMappingConfig {
  enabled: boolean;
  /** Claim that carries the group/role names. Defaults to "groups". */
  groupsClaim: string;
  rules: RoleMappingRule[];
}

/** Resolved instance assignment derived from matched rules. */
export interface ResolvedInstanceGrant {
  instanceId: string;
  instanceRole: InstanceRole;
  featurePermissions: InstanceFeaturePermission[];
}

/** Resolved site-wide grant; expanded to its instances at reconcile time. */
export interface ResolvedSiteGrant {
  siteId: string;
  instanceRole: InstanceRole;
  featurePermissions: InstanceFeaturePermission[];
}

export interface ResolvedMapping {
  /** True when mapping is enabled and the user matched no rule. */
  denied: boolean;
  /** Highest-ranked site role among matched rules, or null to leave unchanged. */
  siteRole: Role | null;
  /** Per-instance assignments the user should have. */
  instanceGrants: ResolvedInstanceGrant[];
  /** Site-wide assignments (apply to every instance in the site). */
  siteGrants: ResolvedSiteGrant[];
}

export const DEFAULT_GROUPS_CLAIM = "groups";

// ADMIN outranks VIEWER when multiple site roles match.
const SITE_ROLE_RANK: Record<Role, number> = {
  ADMIN: 2,
  VIEWER: 1,
} as Record<Role, number>;

// More-privileged instance roles win when the same instance matches twice.
const INSTANCE_ROLE_RANK: Record<InstanceRole, number> = {
  ADMIN: 3,
  OPERATOR: 2,
  EDITOR: 2, // deprecated alias of OPERATOR
  VIEWER: 1,
} as Record<InstanceRole, number>;

/**
 * Extract the list of group/role values from an OIDC profile.
 * Accepts an array of strings, or a single space/comma-separated string.
 * Unknown shapes yield an empty list.
 */
export function extractClaimValues(
  profile: Record<string, unknown> | null | undefined,
  claimName: string,
): string[] {
  if (!profile) return [];
  const raw = profile[claimName];
  if (Array.isArray(raw)) {
    return raw.filter((v): v is string => typeof v === "string" && v.length > 0);
  }
  if (typeof raw === "string") {
    return raw.split(/[\s,]+/).filter(Boolean);
  }
  return [];
}

/**
 * Resolve a provider's mapping rules against the claim values seen on a login.
 *
 * When mapping is disabled, nothing is denied or changed (existing behavior).
 * When enabled and no rule matches, `denied` is true and the caller must block
 * the login. Otherwise the site role and instance grants are computed.
 */
export function resolveRoleMapping(
  config: ProviderMappingConfig,
  claimValues: string[],
): ResolvedMapping {
  if (!config.enabled) {
    return { denied: false, siteRole: null, instanceGrants: [], siteGrants: [] };
  }

  const claimSet = new Set(claimValues);
  const matched = config.rules.filter((rule) => claimSet.has(rule.claimValue));

  if (matched.length === 0) {
    return { denied: true, siteRole: null, instanceGrants: [], siteGrants: [] };
  }

  // Highest-ranked site role across all matched rules.
  let siteRole: Role | null = null;
  let bestSiteRank = 0;
  for (const rule of matched) {
    if (!rule.siteRole) continue;
    const rank = SITE_ROLE_RANK[rule.siteRole] ?? 0;
    if (rank > bestSiteRank) {
      bestSiteRank = rank;
      siteRole = rule.siteRole;
    }
  }

  // Site admins implicitly have full access to every instance and all features,
  // so per-instance/site grants are redundant — drop them. Granular access only
  // applies to site viewers.
  const isAdmin = siteRole === "ADMIN";

  return {
    denied: false,
    siteRole,
    instanceGrants: isAdmin
      ? []
      : buildGrants(matched, "instanceId").map(({ id, ...g }) => ({
          instanceId: id,
          ...g,
        })),
    siteGrants: isAdmin
      ? []
      : buildGrants(matched, "siteId").map(({ id, ...g }) => ({
          siteId: id,
          ...g,
        })),
  };
}

interface MergedGrant {
  id: string;
  instanceRole: InstanceRole;
  featurePermissions: InstanceFeaturePermission[];
}

/**
 * Group matched rules by `instanceId` or `siteId`, keeping the most-privileged
 * role and the union of feature permissions when a target appears more than once.
 */
function buildGrants(
  matched: RoleMappingRule[],
  key: "instanceId" | "siteId",
): MergedGrant[] {
  const byId = new Map<string, MergedGrant>();
  for (const rule of matched) {
    const id = rule[key];
    if (!id || !rule.instanceRole) continue;
    const incomingPerms = rule.featurePermissions ?? [];
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, {
        id,
        instanceRole: rule.instanceRole,
        featurePermissions: mergeFeaturePermissions([], incomingPerms),
      });
      continue;
    }
    if ((INSTANCE_ROLE_RANK[rule.instanceRole] ?? 0) > (INSTANCE_ROLE_RANK[existing.instanceRole] ?? 0)) {
      existing.instanceRole = rule.instanceRole;
    }
    existing.featurePermissions = mergeFeaturePermissions(
      existing.featurePermissions,
      incomingPerms,
    );
  }
  return Array.from(byId.values());
}

/** Merge two feature-permission lists, OR-ing the canEdit/canView flags. */
function mergeFeaturePermissions(
  base: InstanceFeaturePermission[],
  extra: InstanceFeaturePermission[],
): InstanceFeaturePermission[] {
  const byFeature = new Map<string, InstanceFeaturePermission>();
  for (const perm of [...base, ...extra]) {
    const existing = byFeature.get(perm.feature);
    if (!existing) {
      byFeature.set(perm.feature, { ...perm });
    } else {
      existing.canEdit = existing.canEdit || perm.canEdit;
      existing.canView = existing.canView || perm.canView;
    }
  }
  return Array.from(byFeature.values());
}
