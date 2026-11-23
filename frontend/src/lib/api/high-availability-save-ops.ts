import type {
  BatchOperation,
  HAConfig,
  VirtualServer,
  VrrpGarp,
  VrrpGroup,
  VrrpGroupHealthCheck,
  VrrpGroupTransitionScript,
  VrrpSyncGroup,
} from "./high-availability";

type Op = BatchOperation;
type Scalar = string | null | undefined;

// ============================================================================
// Normalizers. The save checks and the emits read values through these.
// ============================================================================

function haText(value: Scalar): string {
  return value == null ? "" : String(value).trim();
}

/** A decimal value without leading zeros, so "0060" and "60" are the same leaf value. */
export function haNumber(value: Scalar): string {
  const text = haText(value);
  return /^\d+$/.test(text) ? text.replace(/^0+(?=\d)/, "") : text;
}

function textList(values: string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    const text = haText(value);
    if (text && !out.includes(text)) out.push(text);
  }
  return out;
}

// ============================================================================
// Numeric bounds from the lab validators (same on 1.4 and 1.5 unless noted)
// ============================================================================

export interface HARange {
  min: number;
  max: number;
}

export const HA_RANGES = {
  vrid: { min: 1, max: 255 },
  priority: { min: 1, max: 255 },
  advertise_interval: { min: 1, max: 255 },
  preempt_delay: { min: 0, max: 1000 },
  startup_delay: { min: 1, max: 600 },
  garp_interval: { min: 0, max: 1000 },
  garp_master_delay: { min: 1, max: 1000 },
  garp_master_refresh: { min: 1, max: 255 },
  garp_master_refresh_repeat: { min: 1, max: 255 },
  garp_master_repeat: { min: 1, max: 255 },
  health_check_failure_count: { min: 1, max: 4294967295 },
  health_check_interval: { min: 1, max: 4294967295 },
  health_check_timeout: { min: 1, max: 4294967295 },
  port: { min: 0, max: 65535 },
  delay_loop: { min: 1, max: 3600 },
  fwmark: { min: 1, max: 2147483647 },
  connection_timeout: { min: 1, max: 86400 },
} as const satisfies Record<string, HARange>;

/** The fields an out-of-range problem names; ha-field-labels.ts maps each to its label key. */
export type HAField = keyof typeof HA_RANGES | "persistence_timeout";

/** The VRRP password validator accepts at most this many characters. */
export const HA_PASSWORD_MAX = 8;

export interface HAProblem<K extends string> {
  key: K | "outOfRange";
  field?: HAField;
  min?: number;
  max?: number;
  address?: string;
  /** The object a problem names (a sync group, or a VRRP group). */
  name?: string;
}

function outOfRange(field: HAField, value: string, range: HARange): HAProblem<never> | null {
  if (!value) return null;
  const decimal = field === "garp_interval" ? /^\d+(\.\d{1,3})?$/ : /^\d+$/;
  const number = Number(value);
  if (decimal.test(value) && number >= range.min && number <= range.max) return null;
  return { key: "outOfRange", field, min: range.min, max: range.max };
}

function firstRange(checks: Array<[HAField, string, HARange]>): HAProblem<never> | null {
  for (const [field, value, range] of checks) {
    const problem = outOfRange(field, value, range);
    if (problem) return problem;
  }
  return null;
}

function healthCheckRanges(value: HAHealthCheckDraft): Array<[HAField, string, HARange]> {
  return [
    ["health_check_failure_count", value.failure_count, HA_RANGES.health_check_failure_count],
    ["health_check_interval", value.interval, HA_RANGES.health_check_interval],
    ["health_check_timeout", value.timeout, HA_RANGES.health_check_timeout],
  ];
}

function garpRanges(value: HAGarpDraft): Array<[HAField, string, HARange]> {
  return [
    ["garp_interval", value.interval, HA_RANGES.garp_interval],
    ["garp_master_delay", value.master_delay, HA_RANGES.garp_master_delay],
    ["garp_master_refresh", value.master_refresh, HA_RANGES.garp_master_refresh],
    ["garp_master_refresh_repeat", value.master_refresh_repeat, HA_RANGES.garp_master_refresh_repeat],
    ["garp_master_repeat", value.master_repeat, HA_RANGES.garp_master_repeat],
  ];
}

// ============================================================================
// Emit helpers
// ============================================================================

/** A single-value leaf: set replaces the value; clear emits the delete. */
function leaf(ops: Op[], setOp: string, deleteOp: string, before: string, after: string, prefix = ""): void {
  if (before === after) return;
  if (after) ops.push({ op: setOp, value: `${prefix}${after}` });
  else if (before) ops.push(prefix ? { op: deleteOp, value: prefix.slice(0, -1) } : { op: deleteOp });
}

/** A presence flag. */
function flag(ops: Op[], setOp: string, deleteOp: string, before: boolean, after: boolean): void {
  if (before === after) return;
  ops.push({ op: after ? setOp : deleteOp });
}

/** A multi-value leaf: delete each removed value, set each added value. */
function multi(ops: Op[], setOp: string, deleteOp: string, before: string[], after: string[]): void {
  for (const value of before) if (!after.includes(value)) ops.push({ op: deleteOp, value });
  for (const value of after) if (!before.includes(value)) ops.push({ op: setOp, value });
}

type SectionLeaf = { set: string; del: string; before: string; after: string };

/**
 * Leaves under a plain node. Deleting the last leaf leaves the empty node on
 * both labs, so a section the edit empties is removed with its own delete.
 */
function section(ops: Op[], sectionDelete: string, leaves: SectionLeaf[]): void {
  const hadAny = leaves.some((item) => item.before);
  const hasAny = leaves.some((item) => item.after);
  if (hadAny && !hasAny) {
    ops.push({ op: sectionDelete });
    return;
  }
  for (const item of leaves) leaf(ops, item.set, item.del, item.before, item.after);
}

// ============================================================================
// Shared drafts
// ============================================================================

export interface HAHealthCheckDraft {
  failure_count: string;
  interval: string;
  ping: string;
  script: string;
  timeout: string;
}

export interface HATransitionScriptDraft {
  backup: string;
  fault: string;
  master: string;
  stop: string;
}

export interface HAGarpDraft {
  interval: string;
  master_delay: string;
  master_refresh: string;
  master_refresh_repeat: string;
  master_repeat: string;
}

const HEALTH_CHECK_KEYS = ["failure_count", "interval", "ping", "script", "timeout"] as const;
const TRANSITION_KEYS = ["backup", "fault", "master", "stop"] as const;
const GARP_KEYS = ["interval", "master_delay", "master_refresh", "master_refresh_repeat", "master_repeat"] as const;
const NUMERIC_HEALTH_CHECK = new Set(["failure_count", "interval", "timeout"]);

function healthCheckDraft(value: VrrpGroupHealthCheck | null | undefined): HAHealthCheckDraft {
  return {
    failure_count: haText(value?.failure_count),
    interval: haText(value?.interval),
    ping: haText(value?.ping),
    script: haText(value?.script),
    timeout: haText(value?.timeout),
  };
}

function transitionDraft(value: VrrpGroupTransitionScript | null | undefined): HATransitionScriptDraft {
  return {
    backup: haText(value?.backup),
    fault: haText(value?.fault),
    master: haText(value?.master),
    stop: haText(value?.stop),
  };
}

function garpDraft(value: VrrpGarp | null | undefined): HAGarpDraft {
  return {
    interval: haText(value?.interval),
    master_delay: haText(value?.master_delay),
    master_refresh: haText(value?.master_refresh),
    master_refresh_repeat: haText(value?.master_refresh_repeat),
    master_repeat: haText(value?.master_repeat),
  };
}

function normalizeHealthCheck(value: HAHealthCheckDraft): HAHealthCheckDraft {
  const out = { ...value };
  for (const key of HEALTH_CHECK_KEYS) {
    out[key] = NUMERIC_HEALTH_CHECK.has(key) ? haNumber(value[key]) : haText(value[key]);
  }
  return out;
}

/**
 * Where timeout is not offered (1.4, or capabilities not loaded) the draft
 * keeps the stored value, so it is neither set nor deleted and the section
 * still counts it when the other leaves are cleared.
 */
function keepHiddenTimeout(before: HAHealthCheckDraft, after: HAHealthCheckDraft, supported: boolean): void {
  if (!supported) after.timeout = before.timeout;
}

function normalizeTransition(value: HATransitionScriptDraft): HATransitionScriptDraft {
  return {
    backup: haText(value.backup),
    fault: haText(value.fault),
    master: haText(value.master),
    stop: haText(value.stop),
  };
}

function normalizeGarp(value: HAGarpDraft): HAGarpDraft {
  return {
    interval: haText(value.interval),
    master_delay: haNumber(value.master_delay),
    master_refresh: haNumber(value.master_refresh),
    master_refresh_repeat: haNumber(value.master_refresh_repeat),
    master_repeat: haNumber(value.master_repeat),
  };
}

function healthCheckLeaves(prefix: string, before: HAHealthCheckDraft, after: HAHealthCheckDraft): SectionLeaf[] {
  return HEALTH_CHECK_KEYS.map((key) => ({
    set: `set_${prefix}_health_check_${key}`,
    del: `delete_${prefix}_health_check_${key}`,
    before: before[key],
    after: after[key],
  }));
}

function transitionLeaves(prefix: string, before: HATransitionScriptDraft, after: HATransitionScriptDraft): SectionLeaf[] {
  return TRANSITION_KEYS.map((key) => ({
    set: `set_${prefix}_transition_script_${key}`,
    del: `delete_${prefix}_transition_script_${key}`,
    before: before[key],
    after: after[key],
  }));
}

function garpLeaves(prefix: string, before: HAGarpDraft, after: HAGarpDraft): SectionLeaf[] {
  return GARP_KEYS.map((key) => ({
    set: `set_${prefix}_garp_${key}`,
    del: `delete_${prefix}_garp_${key}`,
    before: before[key],
    after: after[key],
  }));
}

// ============================================================================
// VRRP group
// ============================================================================

export interface HAAddressDraft {
  address: string;
  interface: string;
}

export interface VrrpGroupDraft {
  name: string;
  vrid: string;
  interface: string;
  description: string;
  priority: string;
  advertise_interval: string;
  addresses: HAAddressDraft[];
  excluded_addresses: HAAddressDraft[];
  auth_type: string;
  /** Blank keeps the stored password; the lab requires one with a type. */
  auth_password: string;
  preempt_delay: string;
  no_preempt: boolean;
  peer_addresses: string[];
  hello_source_address: string;
  rfc3768_compatibility: boolean;
  track_interfaces: string[];
  track_exclude_vrrp_interface: boolean;
  health_check: HAHealthCheckDraft;
  garp: HAGarpDraft;
  transition_script: HATransitionScriptDraft;
}

export function vrrpGroupDraft(group: VrrpGroup | null | undefined): VrrpGroupDraft {
  const addresses = (items: VrrpGroup["addresses"] | undefined) =>
    (items ?? []).map((item) => ({ address: item.address, interface: item.interface ?? "" }));
  return {
    name: group?.name ?? "",
    vrid: haText(group?.vrid),
    interface: haText(group?.interface),
    description: haText(group?.description),
    priority: haText(group?.priority),
    advertise_interval: haText(group?.advertise_interval),
    addresses: addresses(group?.addresses),
    excluded_addresses: addresses(group?.excluded_addresses),
    auth_type: haText(group?.authentication?.type),
    auth_password: "",
    preempt_delay: haText(group?.preempt_delay),
    no_preempt: group?.no_preempt ?? false,
    peer_addresses: [...(group?.peer_addresses ?? [])],
    hello_source_address: haText(group?.hello_source_address),
    rfc3768_compatibility: group?.rfc3768_compatibility ?? false,
    track_interfaces: [...(group?.track.interfaces ?? [])],
    track_exclude_vrrp_interface: group?.track.exclude_vrrp_interface ?? false,
    health_check: healthCheckDraft(group?.health_check),
    garp: garpDraft(group?.garp),
    transition_script: transitionDraft(group?.transition_script),
  };
}

function addressMap(items: HAAddressDraft[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const item of items) {
    const address = haText(item.address);
    if (address && !out.has(address)) out.set(address, haText(item.interface));
  }
  return out;
}

function normalizeVrrpGroup(draft: VrrpGroupDraft): VrrpGroupDraft {
  return {
    ...draft,
    name: haText(draft.name),
    vrid: haNumber(draft.vrid),
    interface: haText(draft.interface),
    description: haText(draft.description),
    priority: haNumber(draft.priority),
    advertise_interval: haNumber(draft.advertise_interval),
    auth_type: haText(draft.auth_type),
    // A password is sent as typed (the lab accepts spaces); only an empty field means keep.
    auth_password: draft.auth_password,
    preempt_delay: haNumber(draft.preempt_delay),
    peer_addresses: textList(draft.peer_addresses),
    hello_source_address: haText(draft.hello_source_address),
    track_interfaces: textList(draft.track_interfaces),
    health_check: normalizeHealthCheck(draft.health_check),
    garp: normalizeGarp(draft.garp),
    transition_script: normalizeTransition(draft.transition_script),
  };
}

export type VrrpGroupProblemKey =
  | "nameRequired"
  | "nameExists"
  | "vridRequired"
  | "interfaceRequired"
  | "addressRequired"
  | "duplicateAddress"
  | "passwordRequired"
  | "passwordTooLong"
  | "healthCheckPingAndScript"
  | "syncMemberHealthCheck";

/** syncGroups: the configured sync groups (a member must not have its own health-check). */
export function vrrpGroupProblem(
  original: VrrpGroup | null,
  draft: VrrpGroupDraft,
  existingNames: string[],
  syncGroups: VrrpSyncGroup[],
): HAProblem<VrrpGroupProblemKey> | null {
  const next = normalizeVrrpGroup(draft);
  if (!next.name) return { key: "nameRequired" };
  if (!original && existingNames.includes(next.name)) return { key: "nameExists" };
  if (!next.vrid) return { key: "vridRequired" };
  if (!next.interface) return { key: "interfaceRequired" };
  const addresses = draft.addresses.map((item) => haText(item.address)).filter(Boolean);
  if (addresses.length === 0) return { key: "addressRequired" };
  for (const list of [addresses, draft.excluded_addresses.map((item) => haText(item.address)).filter(Boolean)]) {
    const repeated = list.find((address, index) => list.indexOf(address) !== index);
    if (repeated) return { key: "duplicateAddress", address: repeated };
  }
  const storedAuth = !!original?.authentication;
  if (next.auth_type && !next.auth_password && !storedAuth) return { key: "passwordRequired" };
  if (next.auth_password.length > HA_PASSWORD_MAX) return { key: "passwordTooLong", max: HA_PASSWORD_MAX };
  if (next.health_check.ping && next.health_check.script) return { key: "healthCheckPingAndScript" };
  const syncGroup = syncGroups.find((group) => group.members.includes(next.name));
  if (syncGroup && HEALTH_CHECK_KEYS.some((key) => next.health_check[key])) {
    return { key: "syncMemberHealthCheck", name: syncGroup.name };
  }
  return firstRange([
    ["vrid", next.vrid, HA_RANGES.vrid],
    ["priority", next.priority, HA_RANGES.priority],
    ["advertise_interval", next.advertise_interval, HA_RANGES.advertise_interval],
    ["preempt_delay", next.preempt_delay, HA_RANGES.preempt_delay],
    ...healthCheckRanges(next.health_check),
    ...garpRanges(next.garp),
  ]);
}

function addressOps(
  ops: Op[],
  kind: "address" | "excluded_address",
  before: Map<string, string>,
  after: Map<string, string>,
): void {
  for (const address of before.keys()) {
    if (!after.has(address)) ops.push({ op: `delete_vrrp_group_${kind}`, value: address });
  }
  for (const [address, iface] of after) {
    const was = before.get(address);
    if (was === undefined) {
      ops.push({ op: `set_vrrp_group_${kind}`, value: address });
      if (iface) ops.push({ op: `set_vrrp_group_${kind}_interface`, value: `${address}|${iface}` });
      continue;
    }
    if (was === iface) continue;
    if (iface) ops.push({ op: `set_vrrp_group_${kind}_interface`, value: `${address}|${iface}` });
    else ops.push({ op: `delete_vrrp_group_${kind}_interface`, value: address });
  }
}

export interface VrrpGroupSaveOptions {
  healthCheckTimeout: boolean;
}

export function vrrpGroupSaveOps(
  original: VrrpGroup | null,
  draft: VrrpGroupDraft,
  options: VrrpGroupSaveOptions,
): Op[] {
  const before = normalizeVrrpGroup(vrrpGroupDraft(original));
  const after = normalizeVrrpGroup(draft);
  keepHiddenTimeout(before.health_check, after.health_check, options.healthCheckTimeout);
  const ops: Op[] = [];
  if (!original) ops.push({ op: "create_vrrp_group" });

  if (after.vrid !== before.vrid) ops.push({ op: "set_vrrp_group_vrid", value: after.vrid });
  if (after.interface !== before.interface) ops.push({ op: "set_vrrp_group_interface", value: after.interface });
  leaf(ops, "set_vrrp_group_description", "delete_vrrp_group_description", before.description, after.description);
  leaf(ops, "set_vrrp_group_priority", "delete_vrrp_group_priority", before.priority, after.priority);
  leaf(
    ops, "set_vrrp_group_advertise_interval", "delete_vrrp_group_advertise_interval",
    before.advertise_interval, after.advertise_interval,
  );

  addressOps(ops, "address", addressMap(before.addresses), addressMap(after.addresses));
  addressOps(ops, "excluded_address", addressMap(before.excluded_addresses), addressMap(after.excluded_addresses));

  if (!after.auth_type) {
    if (original?.authentication) ops.push({ op: "delete_vrrp_group_auth" });
  } else {
    if (after.auth_type !== before.auth_type) ops.push({ op: "set_vrrp_group_auth_type", value: after.auth_type });
    if (after.auth_password) ops.push({ op: "set_vrrp_group_auth_password", value: after.auth_password });
  }

  leaf(ops, "set_vrrp_group_preempt_delay", "delete_vrrp_group_preempt_delay", before.preempt_delay, after.preempt_delay);
  flag(ops, "set_vrrp_group_no_preempt", "delete_vrrp_group_no_preempt", before.no_preempt, after.no_preempt);
  multi(ops, "set_vrrp_group_peer_address", "delete_vrrp_group_peer_address", before.peer_addresses, after.peer_addresses);
  leaf(
    ops, "set_vrrp_group_hello_source_address", "delete_vrrp_group_hello_source_address",
    before.hello_source_address, after.hello_source_address,
  );
  flag(
    ops, "set_vrrp_group_rfc3768_compatibility", "delete_vrrp_group_rfc3768_compatibility",
    before.rfc3768_compatibility, after.rfc3768_compatibility,
  );

  const hadTrack = before.track_interfaces.length > 0 || before.track_exclude_vrrp_interface;
  const hasTrack = after.track_interfaces.length > 0 || after.track_exclude_vrrp_interface;
  if (hadTrack && !hasTrack) {
    ops.push({ op: "delete_vrrp_group_track" });
  } else {
    multi(
      ops, "set_vrrp_group_track_interface", "delete_vrrp_group_track_interface",
      before.track_interfaces, after.track_interfaces,
    );
    flag(
      ops, "set_vrrp_group_track_exclude_vrrp_interface", "delete_vrrp_group_track_exclude_vrrp_interface",
      before.track_exclude_vrrp_interface, after.track_exclude_vrrp_interface,
    );
  }

  section(ops, "delete_vrrp_group_health_check", healthCheckLeaves("vrrp_group", before.health_check, after.health_check));
  section(ops, "delete_vrrp_group_garp", garpLeaves("vrrp_group", before.garp, after.garp));
  section(
    ops, "delete_vrrp_group_transition_script",
    transitionLeaves("vrrp_group", before.transition_script, after.transition_script),
  );
  return ops;
}

// ============================================================================
// VRRP sync group
// ============================================================================

export interface VrrpSyncGroupDraft {
  name: string;
  members: string[];
  health_check: HAHealthCheckDraft;
  transition_script: HATransitionScriptDraft;
}

export function vrrpSyncGroupDraft(group: VrrpSyncGroup | null | undefined): VrrpSyncGroupDraft {
  return {
    name: group?.name ?? "",
    members: [...(group?.members ?? [])],
    health_check: healthCheckDraft(group?.health_check),
    transition_script: transitionDraft(group?.transition_script),
  };
}

function normalizeSyncGroup(draft: VrrpSyncGroupDraft): VrrpSyncGroupDraft {
  return {
    name: haText(draft.name),
    members: textList(draft.members),
    health_check: normalizeHealthCheck(draft.health_check),
    transition_script: normalizeTransition(draft.transition_script),
  };
}

export type VrrpSyncGroupProblemKey =
  | "nameRequired"
  | "nameExists"
  | "membersRequired"
  | "healthCheckPingAndScript"
  | "memberHasHealthCheck";

/** groupsWithHealthCheck: VRRP groups that keep their own health-check (the lab rejects them as members). */
export function vrrpSyncGroupProblem(
  original: VrrpSyncGroup | null,
  draft: VrrpSyncGroupDraft,
  existingNames: string[],
  groupsWithHealthCheck: string[],
): HAProblem<VrrpSyncGroupProblemKey> | null {
  const next = normalizeSyncGroup(draft);
  if (!next.name) return { key: "nameRequired" };
  if (!original && existingNames.includes(next.name)) return { key: "nameExists" };
  if (next.members.length === 0) return { key: "membersRequired" };
  if (next.health_check.ping && next.health_check.script) return { key: "healthCheckPingAndScript" };
  const blocked = next.members.find((member) => groupsWithHealthCheck.includes(member));
  if (blocked) return { key: "memberHasHealthCheck", name: blocked };
  return firstRange(healthCheckRanges(next.health_check));
}

export interface VrrpSyncGroupSaveOptions {
  healthCheckTimeout: boolean;
}

export function vrrpSyncGroupSaveOps(
  original: VrrpSyncGroup | null,
  draft: VrrpSyncGroupDraft,
  options: VrrpSyncGroupSaveOptions,
): Op[] {
  const before = normalizeSyncGroup(vrrpSyncGroupDraft(original));
  const after = normalizeSyncGroup(draft);
  keepHiddenTimeout(before.health_check, after.health_check, options.healthCheckTimeout);
  const ops: Op[] = [];
  if (!original) ops.push({ op: "create_vrrp_sync_group" });
  multi(ops, "set_vrrp_sync_group_member", "delete_vrrp_sync_group_member", before.members, after.members);
  section(
    ops, "delete_vrrp_sync_group_health_check",
    healthCheckLeaves("vrrp_sync_group", before.health_check, after.health_check),
  );
  section(
    ops, "delete_vrrp_sync_group_transition_script",
    transitionLeaves("vrrp_sync_group", before.transition_script, after.transition_script),
  );
  return ops;
}

// ============================================================================
// Virtual server
// ============================================================================

export interface HARealServerDraft {
  address: string;
  port: string;
  connection_timeout: string;
  health_check_script: string;
}

export interface VirtualServerDraft {
  name: string;
  address: string;
  port: string;
  fwmark: string;
  protocol: string;
  algorithm: string;
  forward_method: string;
  delay_loop: string;
  persistence_timeout: string;
  real_servers: HARealServerDraft[];
}

export function virtualServerDraft(server: VirtualServer | null | undefined): VirtualServerDraft {
  return {
    name: server?.name ?? "",
    address: haText(server?.address),
    port: haText(server?.port),
    fwmark: haText(server?.fwmark),
    protocol: haText(server?.protocol),
    algorithm: haText(server?.algorithm),
    forward_method: haText(server?.forward_method),
    delay_loop: haText(server?.delay_loop),
    persistence_timeout: haText(server?.persistence_timeout),
    real_servers: (server?.real_servers ?? []).map((item) => ({
      address: item.address,
      port: haText(item.port),
      connection_timeout: haText(item.connection_timeout),
      health_check_script: haText(item.health_check_script),
    })),
  };
}

function normalizeRealServer(item: HARealServerDraft): HARealServerDraft {
  return {
    address: haText(item.address),
    port: haNumber(item.port),
    connection_timeout: haNumber(item.connection_timeout),
    health_check_script: haText(item.health_check_script),
  };
}

function normalizeVirtualServer(draft: VirtualServerDraft): VirtualServerDraft {
  return {
    name: haText(draft.name),
    address: haText(draft.address),
    port: haNumber(draft.port),
    fwmark: haNumber(draft.fwmark),
    protocol: haText(draft.protocol),
    algorithm: haText(draft.algorithm),
    forward_method: haText(draft.forward_method),
    delay_loop: haNumber(draft.delay_loop),
    persistence_timeout: haNumber(draft.persistence_timeout),
    real_servers: draft.real_servers.map(normalizeRealServer),
  };
}

export type VirtualServerProblemKey =
  | "nameRequired"
  | "nameExists"
  | "addressOrFwmarkRequired"
  | "portOrFwmarkRequired"
  | "portAndFwmark"
  | "realServerRequired"
  | "realServerAddressRequired"
  | "realServerPortRequired"
  | "duplicateRealServer";

/** persistence: the persistence-timeout range from capabilities (1.5 also accepts 0). */
export function virtualServerProblem(
  original: VirtualServer | null,
  draft: VirtualServerDraft,
  existingNames: string[],
  persistence: HARange,
): HAProblem<VirtualServerProblemKey> | null {
  const next = normalizeVirtualServer(draft);
  if (!next.name) return { key: "nameRequired" };
  if (!original && existingNames.includes(next.name)) return { key: "nameExists" };
  if (!next.address && !next.fwmark) return { key: "addressOrFwmarkRequired" };
  if (!next.port && !next.fwmark) return { key: "portOrFwmarkRequired" };
  if (next.port && next.fwmark) return { key: "portAndFwmark" };
  if (next.real_servers.length === 0) return { key: "realServerRequired" };
  const seen = new Set<string>();
  for (const item of next.real_servers) {
    if (!item.address) return { key: "realServerAddressRequired" };
    if (!item.port) return { key: "realServerPortRequired", address: item.address };
    if (seen.has(item.address)) return { key: "duplicateRealServer", address: item.address };
    seen.add(item.address);
  }
  const serverRange = firstRange([
    ["port", next.port, HA_RANGES.port],
    ["fwmark", next.fwmark, HA_RANGES.fwmark],
    ["delay_loop", next.delay_loop, HA_RANGES.delay_loop],
    ["persistence_timeout", next.persistence_timeout, persistence],
  ]);
  if (serverRange) return serverRange;
  for (const item of next.real_servers) {
    const problem = firstRange([
      ["port", item.port, HA_RANGES.port],
      ["connection_timeout", item.connection_timeout, HA_RANGES.connection_timeout],
    ]);
    if (problem) return { ...problem, address: item.address };
  }
  return null;
}

export function virtualServerSaveOps(original: VirtualServer | null, draft: VirtualServerDraft): Op[] {
  const before = normalizeVirtualServer(virtualServerDraft(original));
  const after = normalizeVirtualServer(draft);
  const ops: Op[] = [];
  if (!original) ops.push({ op: "create_virtual_server" });

  leaf(ops, "set_virtual_server_address", "delete_virtual_server_address", before.address, after.address);
  leaf(ops, "set_virtual_server_port", "delete_virtual_server_port", before.port, after.port);
  leaf(ops, "set_virtual_server_fwmark", "delete_virtual_server_fwmark", before.fwmark, after.fwmark);
  leaf(ops, "set_virtual_server_protocol", "delete_virtual_server_protocol", before.protocol, after.protocol);
  leaf(ops, "set_virtual_server_algorithm", "delete_virtual_server_algorithm", before.algorithm, after.algorithm);
  leaf(
    ops, "set_virtual_server_forward_method", "delete_virtual_server_forward_method",
    before.forward_method, after.forward_method,
  );
  leaf(ops, "set_virtual_server_delay_loop", "delete_virtual_server_delay_loop", before.delay_loop, after.delay_loop);
  leaf(
    ops, "set_virtual_server_persistence_timeout", "delete_virtual_server_persistence_timeout",
    before.persistence_timeout, after.persistence_timeout,
  );

  const was = new Map(before.real_servers.map((item) => [item.address, item]));
  const now = new Map(after.real_servers.map((item) => [item.address, item]));
  for (const address of was.keys()) {
    if (!now.has(address)) ops.push({ op: "delete_virtual_server_real_server", value: address });
  }
  for (const [address, item] of now) {
    const old = was.get(address);
    const prefix = `${address}|`;
    if (!old) ops.push({ op: "set_virtual_server_real_server", value: address });
    // port is required on a real server: it is replaced, never deleted.
    if (item.port && item.port !== old?.port) {
      ops.push({ op: "set_virtual_server_real_server_port", value: `${prefix}${item.port}` });
    }
    leaf(
      ops, "set_virtual_server_real_server_connection_timeout", "delete_virtual_server_real_server_connection_timeout",
      old?.connection_timeout ?? "", item.connection_timeout, prefix,
    );
    leaf(
      ops, "set_virtual_server_real_server_health_check_script", "delete_virtual_server_real_server_health_check",
      old?.health_check_script ?? "", item.health_check_script, prefix,
    );
  }
  return ops;
}

// ============================================================================
// Global settings
// ============================================================================

export interface HAGlobalsDraft {
  startup_delay: string;
  version: string;
  garp: HAGarpDraft;
  snmp: boolean;
  snmp_trap: boolean;
}

export function haGlobalsDraft(config: HAConfig | null | undefined): HAGlobalsDraft {
  return {
    startup_delay: haText(config?.vrrp.global_parameters.startup_delay),
    version: haText(config?.vrrp.global_parameters.version),
    garp: garpDraft(config?.vrrp.global_parameters.garp),
    snmp: config?.vrrp.snmp ?? false,
    snmp_trap: config?.vrrp.snmp_trap ?? false,
  };
}

export interface HAGlobalsSaveOptions {
  snmpTrap: boolean;
}

export function haGlobalsProblem(draft: HAGlobalsDraft): HAProblem<never> | null {
  return firstRange([
    ["startup_delay", haNumber(draft.startup_delay), HA_RANGES.startup_delay],
    ...garpRanges(normalizeGarp(draft.garp)),
  ]);
}

function normalizeGlobals(draft: HAGlobalsDraft, options: HAGlobalsSaveOptions): HAGlobalsDraft {
  return {
    startup_delay: haNumber(draft.startup_delay),
    version: haText(draft.version),
    garp: normalizeGarp(draft.garp),
    snmp: draft.snmp,
    // trap is a child of snmp and exists only where capabilities say so.
    snmp_trap: options.snmpTrap && draft.snmp && draft.snmp_trap,
  };
}

export function haGlobalsSaveOps(config: HAConfig, draft: HAGlobalsDraft, options: HAGlobalsSaveOptions): Op[] {
  const before = normalizeGlobals(haGlobalsDraft(config), options);
  const after = normalizeGlobals(draft, options);
  const ops: Op[] = [];
  const garpBefore = GARP_KEYS.some((key) => before.garp[key]);
  const paramsAfter = !!after.startup_delay || !!after.version || GARP_KEYS.some((key) => after.garp[key]);
  const paramsBefore = !!before.startup_delay || !!before.version || garpBefore;
  if (paramsBefore && !paramsAfter) {
    ops.push({ op: "delete_vrrp_global_parameters" });
  } else {
    leaf(ops, "set_vrrp_global_startup_delay", "delete_vrrp_global_startup_delay", before.startup_delay, after.startup_delay);
    leaf(ops, "set_vrrp_global_version", "delete_vrrp_global_version", before.version, after.version);
    section(ops, "delete_vrrp_global_garp", garpLeaves("vrrp_global", before.garp, after.garp));
  }
  if (before.snmp && !after.snmp) {
    // Deleting snmp also removes trap.
    ops.push({ op: "delete_vrrp_snmp" });
  } else {
    flag(ops, "set_vrrp_snmp", "delete_vrrp_snmp", before.snmp, after.snmp);
    flag(ops, "set_vrrp_snmp_trap", "delete_vrrp_snmp_trap", before.snmp_trap, after.snmp_trap);
  }
  return ops;
}
