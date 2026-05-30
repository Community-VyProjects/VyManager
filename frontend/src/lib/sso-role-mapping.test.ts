// Unit tests for the SSO role-mapping resolver.
// Run inside the frontend container:  npx tsx src/lib/sso-role-mapping.test.ts
//
// Pure logic only — no DB or Better Auth required.

import assert from "node:assert/strict";
import type { Role, InstanceRole } from "@prisma/client";
import {
  extractClaimValues,
  resolveRoleMapping,
  DEFAULT_GROUPS_CLAIM,
  type ProviderMappingConfig,
  type RoleMappingRule,
} from "./sso-role-mapping";

const ADMIN = "ADMIN" as Role;
const VIEWER = "VIEWER" as Role;
const I_ADMIN = "ADMIN" as InstanceRole;
const I_VIEWER = "VIEWER" as InstanceRole;
const I_OPERATOR = "OPERATOR" as InstanceRole;

function rule(partial: Partial<RoleMappingRule> & { claimValue: string }): RoleMappingRule {
  return {
    siteRole: null,
    instanceId: null,
    siteId: null,
    instanceRole: null,
    featurePermissions: null,
    priority: 0,
    ...partial,
  };
}

function config(rules: RoleMappingRule[], enabled = true): ProviderMappingConfig {
  return { enabled, groupsClaim: DEFAULT_GROUPS_CLAIM, rules };
}

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

console.log("extractClaimValues");
test("reads an array of strings", () => {
  assert.deepEqual(
    extractClaimValues({ groups: ["a", "b"] }, "groups"),
    ["a", "b"],
  );
});
test("splits a space/comma separated string", () => {
  assert.deepEqual(
    extractClaimValues({ groups: "a, b  c" }, "groups"),
    ["a", "b", "c"],
  );
});
test("filters non-strings and empties out of arrays", () => {
  assert.deepEqual(
    extractClaimValues({ groups: ["a", "", 5, null] as unknown[] }, "groups"),
    ["a"],
  );
});
test("missing claim or null profile yields []", () => {
  assert.deepEqual(extractClaimValues({ roles: ["a"] }, "groups"), []);
  assert.deepEqual(extractClaimValues(null, "groups"), []);
  assert.deepEqual(extractClaimValues(undefined, "groups"), []);
});

console.log("resolveRoleMapping — gating");
test("disabled mapping never denies and changes nothing", () => {
  const r = resolveRoleMapping(config([rule({ claimValue: "x", siteRole: ADMIN })], false), []);
  assert.equal(r.denied, false);
  assert.equal(r.siteRole, null);
  assert.deepEqual(r.instanceGrants, []);
});
test("enabled + no matching claim is denied", () => {
  const r = resolveRoleMapping(config([rule({ claimValue: "admins", siteRole: ADMIN })]), ["users"]);
  assert.equal(r.denied, true);
  assert.equal(r.siteRole, null);
});
test("enabled + matching claim is allowed", () => {
  const r = resolveRoleMapping(config([rule({ claimValue: "admins", siteRole: ADMIN })]), ["admins"]);
  assert.equal(r.denied, false);
  assert.equal(r.siteRole, ADMIN);
});

console.log("resolveRoleMapping — site role precedence");
test("ADMIN outranks VIEWER when both match", () => {
  const r = resolveRoleMapping(
    config([
      rule({ claimValue: "staff", siteRole: VIEWER }),
      rule({ claimValue: "admins", siteRole: ADMIN }),
    ]),
    ["staff", "admins"],
  );
  assert.equal(r.siteRole, ADMIN);
});
test("site ADMIN drops instance grants (admins get full access)", () => {
  const r = resolveRoleMapping(
    config([
      rule({ claimValue: "admins", siteRole: ADMIN }),
      rule({ claimValue: "admins", instanceId: "inst1", instanceRole: I_OPERATOR }),
    ]),
    ["admins"],
  );
  assert.equal(r.siteRole, ADMIN);
  assert.deepEqual(r.instanceGrants, []);
});
test("matched rule with only instance grant leaves site role null but allows", () => {
  const r = resolveRoleMapping(
    config([rule({ claimValue: "ops", instanceId: "inst1", instanceRole: I_VIEWER })]),
    ["ops"],
  );
  assert.equal(r.denied, false);
  assert.equal(r.siteRole, null);
  assert.equal(r.instanceGrants.length, 1);
});

console.log("resolveRoleMapping — site grants");
test("collects site grants separately from instance grants", () => {
  const r = resolveRoleMapping(
    config([
      rule({ claimValue: "ops", siteId: "site1", instanceRole: I_OPERATOR }),
      rule({ claimValue: "ops", instanceId: "inst1", instanceRole: I_VIEWER }),
    ]),
    ["ops"],
  );
  assert.equal(r.siteGrants.length, 1);
  assert.equal(r.siteGrants[0].siteId, "site1");
  assert.equal(r.instanceGrants.length, 1);
});
test("site ADMIN drops site grants too", () => {
  const r = resolveRoleMapping(
    config([
      rule({ claimValue: "a", siteRole: ADMIN }),
      rule({ claimValue: "a", siteId: "site1", instanceRole: I_OPERATOR }),
    ]),
    ["a"],
  );
  assert.deepEqual(r.siteGrants, []);
  assert.deepEqual(r.instanceGrants, []);
});

console.log("resolveRoleMapping — instance grant union");
test("unions distinct instances", () => {
  const r = resolveRoleMapping(
    config([
      rule({ claimValue: "ops", instanceId: "inst1", instanceRole: I_VIEWER }),
      rule({ claimValue: "ops", instanceId: "inst2", instanceRole: I_ADMIN }),
    ]),
    ["ops"],
  );
  assert.equal(r.instanceGrants.length, 2);
});
test("keeps most-privileged role for a duplicated instance", () => {
  const r = resolveRoleMapping(
    config([
      rule({ claimValue: "a", instanceId: "inst1", instanceRole: I_VIEWER }),
      rule({ claimValue: "b", instanceId: "inst1", instanceRole: I_OPERATOR }),
    ]),
    ["a", "b"],
  );
  assert.equal(r.instanceGrants.length, 1);
  assert.equal(r.instanceGrants[0].instanceRole, I_OPERATOR);
});
test("merges feature permissions (OR of flags) for a duplicated instance", () => {
  const r = resolveRoleMapping(
    config([
      rule({
        claimValue: "a",
        instanceId: "inst1",
        instanceRole: I_OPERATOR,
        featurePermissions: [{ feature: "FIREWALL", canEdit: true, canView: false }],
      }),
      rule({
        claimValue: "b",
        instanceId: "inst1",
        instanceRole: I_OPERATOR,
        featurePermissions: [
          { feature: "FIREWALL", canEdit: false, canView: true },
          { feature: "NAT", canEdit: true, canView: true },
        ],
      }),
    ]),
    ["a", "b"],
  );
  const grant = r.instanceGrants[0];
  const fw = grant.featurePermissions.find((p) => p.feature === "FIREWALL");
  assert.deepEqual(fw, { feature: "FIREWALL", canEdit: true, canView: true });
  assert.equal(grant.featurePermissions.length, 2);
});

console.log(`\n${passed} tests passed`);
