import type {
  FirewallGlobalOptionsCapabilities,
  FirewallGlobalOptionsConfig,
  GlobalOptionsBatchOperation,
  StatePolicyState,
} from "./firewall-global-options";
import { isValidIPv4, isValidIPv6 } from "../validators/firewall";

/** A stored MaxMind license key loads as this mask; the save never sends it. */
export const MASKED_SECRET = "***";

/** Single-value leaves whose builder ops are `set_<key>` / `delete_<key>`. */
export const TOGGLE_KEYS = [
  "all_ping",
  "broadcast_ping",
  "directed_broadcast",
  "ip_src_route",
  "ipv6_src_route",
  "receive_redirects",
  "ipv6_receive_redirects",
  "send_redirects",
  "log_martians",
  "source_validation",
  "ipv6_source_validation",
  "syn_cookies",
  "twa_hazards_protection",
] as const;
export type ToggleKey = (typeof TOGGLE_KEYS)[number];

export const STATES = ["established", "invalid", "related"] as const;
export type StateKey = (typeof STATES)[number];

export const TCP_TIMEOUT_KEYS = [
  "tcp_established",
  "tcp_close",
  "tcp_close_wait",
  "tcp_fin_wait",
  "tcp_last_ack",
  "tcp_syn_recv",
  "tcp_syn_sent",
  "tcp_time_wait",
] as const;
export const UDP_TIMEOUT_KEYS = ["udp_stream", "udp_other"] as const;
export const TIMEOUT_KEYS = ["icmp", "other", ...TCP_TIMEOUT_KEYS, ...UDP_TIMEOUT_KEYS] as const;
export type TimeoutKey = (typeof TIMEOUT_KEYS)[number];

/** Single-value geoip leaves (the license key has its own mask rule). */
const GEOIP_VALUE_KEYS = ["provider", "maxmind_account_id", "source_address", "vrf"] as const;

export interface StateDraft {
  action: string;
  log: boolean;
  log_level: string;
}

export interface GlobalOptionsDraft {
  toggles: Record<ToggleKey, string>;
  resolver_cache: boolean;
  resolver_interval: string;
  states: Record<StateKey, StateDraft>;
  offload_target: string;
  bridged_ipv4: boolean;
  bridged_ipv6: boolean;
  bridged_ethernet_types: string[];
  geoip: {
    provider: string;
    maxmind_account_id: string;
    maxmind_license_key: string;
    maxmind_lite: boolean;
    source_address: string;
    vrf: string;
  };
  timeouts: Record<TimeoutKey, string>;
}

function text(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function num(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

function stateDraft(state: StatePolicyState | null | undefined): StateDraft {
  return { action: text(state?.action), log: state?.log === true, log_level: text(state?.log_level) };
}

/** The editable form of a loaded config. */
export function draftFromConfig(config: FirewallGlobalOptionsConfig): GlobalOptionsDraft {
  const toggles = {} as Record<ToggleKey, string>;
  for (const key of TOGGLE_KEYS) toggles[key] = text(config[key]);
  const timeouts = {} as Record<TimeoutKey, string>;
  for (const key of TIMEOUT_KEYS) timeouts[key] = num(config.timeouts?.[key]);
  const geoip = config.geoip;
  return {
    toggles,
    resolver_cache: config.resolver_cache === true,
    resolver_interval: num(config.resolver_interval),
    states: {
      established: stateDraft(config.state_policy?.established),
      invalid: stateDraft(config.state_policy?.invalid),
      related: stateDraft(config.state_policy?.related),
    },
    offload_target: text(config.state_policy?.offload_target),
    bridged_ipv4: config.bridged_traffic?.ipv4 === true,
    bridged_ipv6: config.bridged_traffic?.ipv6 === true,
    bridged_ethernet_types: [...(config.bridged_traffic?.accept_invalid_ethernet_types ?? [])],
    geoip: {
      provider: text(geoip?.provider),
      maxmind_account_id: text(geoip?.maxmind_account_id),
      maxmind_license_key: text(geoip?.maxmind_license_key),
      maxmind_lite: geoip?.maxmind_lite === true,
      source_address: text(geoip?.source_address),
      vrf: text(geoip?.vrf),
    },
    timeouts,
  };
}

/** Trim every field the check and the emit read, so both see the same value. */
function normalize(draft: GlobalOptionsDraft): GlobalOptionsDraft {
  const toggles = {} as Record<ToggleKey, string>;
  for (const key of TOGGLE_KEYS) toggles[key] = text(draft.toggles[key]);
  const timeouts = {} as Record<TimeoutKey, string>;
  for (const key of TIMEOUT_KEYS) timeouts[key] = text(draft.timeouts[key]);
  const states = {} as Record<StateKey, StateDraft>;
  for (const state of STATES) {
    const s = draft.states[state];
    states[state] = { action: text(s.action), log: s.log, log_level: text(s.log_level) };
  }
  return {
    toggles,
    resolver_cache: draft.resolver_cache,
    resolver_interval: text(draft.resolver_interval),
    states,
    offload_target: text(draft.offload_target),
    bridged_ipv4: draft.bridged_ipv4,
    bridged_ipv6: draft.bridged_ipv6,
    bridged_ethernet_types: [...new Set(draft.bridged_ethernet_types.map(text).filter(Boolean))],
    geoip: {
      provider: text(draft.geoip.provider),
      maxmind_account_id: text(draft.geoip.maxmind_account_id),
      maxmind_license_key: text(draft.geoip.maxmind_license_key),
      maxmind_lite: draft.geoip.maxmind_lite,
      source_address: text(draft.geoip.source_address),
      vrf: text(draft.geoip.vrf),
    },
    timeouts,
  };
}

// ==================== Save checks ====================

export interface GlobalOptionsRange {
  min: number;
  max: number;
}

/** Lab val_help bounds, used when capabilities have not loaded. */
export const RESOLVER_INTERVAL_RANGE: GlobalOptionsRange = { min: 10, max: 3600 };
export const TIMEOUT_RANGE: GlobalOptionsRange = { min: 1, max: 21474836 };

export function globalOptionsRange(
  capabilities: FirewallGlobalOptionsCapabilities | null | undefined,
  feature: "resolver_interval" | "timeouts",
): GlobalOptionsRange {
  const node = capabilities?.features?.[feature];
  const fallback = feature === "timeouts" ? TIMEOUT_RANGE : RESOLVER_INTERVAL_RANGE;
  return {
    min: typeof node?.min === "number" ? node.min : fallback.min,
    max: typeof node?.max === "number" ? node.max : fallback.max,
  };
}

export type GlobalOptionsProblemKey =
  | "resolverIntervalRange"
  | "timeoutRange"
  | "maxmindAccountRequired"
  | "maxmindKeyRequired"
  | "licenseKeyIsMask"
  | "sourceAddressInvalid";

export interface GlobalOptionsProblem {
  key: GlobalOptionsProblemKey;
  min?: number;
  max?: number;
}

function inRange(value: string, range: GlobalOptionsRange): boolean {
  if (!/^\d+$/.test(value)) return false;
  const n = Number(value);
  return n >= range.min && n <= range.max;
}

/** A batch the lab would reject, or null. */
export function globalOptionsProblem(
  originalDraft: GlobalOptionsDraft,
  updatedDraft: GlobalOptionsDraft,
  ranges: { resolverInterval: GlobalOptionsRange; timeout: GlobalOptionsRange },
): GlobalOptionsProblem | null {
  const original = normalize(originalDraft);
  const updated = normalize(updatedDraft);
  if (updated.resolver_interval && !inRange(updated.resolver_interval, ranges.resolverInterval)) {
    return { key: "resolverIntervalRange", ...ranges.resolverInterval };
  }
  for (const key of TIMEOUT_KEYS) {
    if (updated.timeouts[key] && !inRange(updated.timeouts[key], ranges.timeout)) {
      return { key: "timeoutRange", ...ranges.timeout };
    }
  }
  const geoip = updated.geoip;
  const storedKey = original.geoip.maxmind_license_key === MASKED_SECRET;
  if (geoip.maxmind_license_key === MASKED_SECRET && !storedKey) {
    return { key: "licenseKeyIsMask" };
  }
  if (geoip.provider === "maxmind") {
    if (!geoip.maxmind_account_id) return { key: "maxmindAccountRequired" };
    if (!geoip.maxmind_license_key) return { key: "maxmindKeyRequired" };
  }
  if (geoip.source_address && !(isValidIPv4(geoip.source_address) || isValidIPv6(geoip.source_address))) {
    return { key: "sourceAddressInvalid" };
  }
  return null;
}

// ==================== Emit ====================

type Ops = GlobalOptionsBatchOperation[];

/** A single-value leaf: set when changed, delete when cleared. */
function leaf(ops: Ops, setOp: string, deleteOp: string, before: string, after: string): void {
  if (before === after) return;
  if (after) ops.push({ op: setOp, value: after });
  else ops.push({ op: deleteOp });
}

/** A valueless flag. */
function flag(ops: Ops, setOp: string, deleteOp: string, before: boolean, after: boolean): void {
  if (before === after) return;
  ops.push({ op: after ? setOp : deleteOp });
}

function stateEmpty(state: StateDraft): boolean {
  return !state.action && !state.log && !state.log_level;
}

function statePolicyEmpty(draft: GlobalOptionsDraft): boolean {
  return STATES.every((state) => stateEmpty(draft.states[state])) && !draft.offload_target;
}

function bridgedEmpty(draft: GlobalOptionsDraft): boolean {
  return !draft.bridged_ipv4 && !draft.bridged_ipv6 && draft.bridged_ethernet_types.length === 0;
}

function geoipEmpty(draft: GlobalOptionsDraft): boolean {
  const g = draft.geoip;
  return GEOIP_VALUE_KEYS.every((key) => !g[key]) && !g.maxmind_license_key && !g.maxmind_lite;
}

function timeoutsEmpty(draft: GlobalOptionsDraft, keys: readonly TimeoutKey[]): boolean {
  return keys.every((key) => !draft.timeouts[key]);
}

function draftEmpty(draft: GlobalOptionsDraft): boolean {
  return (
    TOGGLE_KEYS.every((key) => !draft.toggles[key]) &&
    !draft.resolver_cache &&
    !draft.resolver_interval &&
    statePolicyEmpty(draft) &&
    bridgedEmpty(draft) &&
    geoipEmpty(draft) &&
    timeoutsEmpty(draft, TIMEOUT_KEYS)
  );
}

/**
 * Emit a section: when the edit clears every leaf the original held, delete
 * the section node itself (deleting its last leaf leaves an empty parent on
 * the router); otherwise diff its leaves.
 */
function section(
  ops: Ops,
  beforeEmpty: boolean,
  afterEmpty: boolean,
  deleteOp: string,
  diffLeaves: () => void,
): void {
  if (afterEmpty) {
    if (!beforeEmpty) ops.push({ op: deleteOp });
    return;
  }
  diffLeaves();
}

function emitStatePolicy(ops: Ops, before: GlobalOptionsDraft, after: GlobalOptionsDraft): void {
  section(ops, statePolicyEmpty(before), statePolicyEmpty(after), "delete_state_policy", () => {
    for (const state of STATES) {
      const b = before.states[state];
      const a = after.states[state];
      const prefix = `state_policy_${state}`;
      section(ops, stateEmpty(b), stateEmpty(a), `delete_${prefix}`, () => {
        leaf(ops, `set_${prefix}_action`, `delete_${prefix}_action`, b.action, a.action);
        flag(ops, `set_${prefix}_log`, `delete_${prefix}_log`, b.log, a.log);
        leaf(ops, `set_${prefix}_log_level`, `delete_${prefix}_log_level`, b.log_level, a.log_level);
      });
    }
    // offload-target is required under offload: a clear deletes offload.
    section(ops, !before.offload_target, !after.offload_target, "delete_state_policy_offload", () => {
      if (before.offload_target !== after.offload_target) {
        ops.push({ op: "set_state_policy_offload_target", value: after.offload_target });
      }
    });
  });
}

function emitBridged(ops: Ops, before: GlobalOptionsDraft, after: GlobalOptionsDraft): void {
  section(ops, bridgedEmpty(before), bridgedEmpty(after), "delete_apply_to_bridged_traffic", () => {
    flag(ops, "set_apply_to_bridged_traffic_ipv4", "delete_apply_to_bridged_traffic_ipv4", before.bridged_ipv4, after.bridged_ipv4);
    flag(ops, "set_apply_to_bridged_traffic_ipv6", "delete_apply_to_bridged_traffic_ipv6", before.bridged_ipv6, after.bridged_ipv6);
    const b = before.bridged_ethernet_types;
    const a = after.bridged_ethernet_types;
    section(ops, b.length === 0, a.length === 0, "delete_apply_to_bridged_traffic_accept_invalid", () => {
      for (const type of b) {
        if (!a.includes(type)) ops.push({ op: "delete_apply_to_bridged_traffic_accept_invalid_ethernet_type", value: type });
      }
      for (const type of a) {
        if (!b.includes(type)) ops.push({ op: "set_apply_to_bridged_traffic_accept_invalid_ethernet_type", value: type });
      }
    });
  });
}

function emitGeoip(ops: Ops, before: GlobalOptionsDraft, after: GlobalOptionsDraft): void {
  section(ops, geoipEmpty(before), geoipEmpty(after), "delete_geoip", () => {
    for (const key of GEOIP_VALUE_KEYS) {
      leaf(ops, `set_geoip_${key}`, `delete_geoip_${key}`, before.geoip[key], after.geoip[key]);
    }
    // The stored key loads as the mask: unchanged mask keeps it, a cleared
    // field deletes it, new text sets it.
    const key = after.geoip.maxmind_license_key;
    if (key !== MASKED_SECRET) {
      leaf(ops, "set_geoip_maxmind_license_key", "delete_geoip_maxmind_license_key", before.geoip.maxmind_license_key, key);
    }
    flag(ops, "set_geoip_maxmind_lite", "delete_geoip_maxmind_lite", before.geoip.maxmind_lite, after.geoip.maxmind_lite);
  });
}

function emitTimeouts(ops: Ops, before: GlobalOptionsDraft, after: GlobalOptionsDraft): void {
  const timeoutLeaf = (key: TimeoutKey) =>
    leaf(ops, `set_timeout_${key}`, `delete_timeout_${key}`, before.timeouts[key], after.timeouts[key]);
  section(ops, timeoutsEmpty(before, TIMEOUT_KEYS), timeoutsEmpty(after, TIMEOUT_KEYS), "delete_timeout", () => {
    timeoutLeaf("icmp");
    timeoutLeaf("other");
    section(ops, timeoutsEmpty(before, TCP_TIMEOUT_KEYS), timeoutsEmpty(after, TCP_TIMEOUT_KEYS), "delete_timeout_tcp", () =>
      TCP_TIMEOUT_KEYS.forEach(timeoutLeaf),
    );
    section(ops, timeoutsEmpty(before, UDP_TIMEOUT_KEYS), timeoutsEmpty(after, UDP_TIMEOUT_KEYS), "delete_timeout_udp", () =>
      UDP_TIMEOUT_KEYS.forEach(timeoutLeaf),
    );
  });
}

/** Every op that turns the original options into the updated ones, in one batch. */
export function globalOptionsSaveOps(originalDraft: GlobalOptionsDraft, updatedDraft: GlobalOptionsDraft): Ops {
  const before = normalize(originalDraft);
  const after = normalize(updatedDraft);
  const ops: Ops = [];
  section(ops, draftEmpty(before), draftEmpty(after), "delete_global_options", () => {
    for (const key of TOGGLE_KEYS) {
      leaf(ops, `set_${key}`, `delete_${key}`, before.toggles[key], after.toggles[key]);
    }
    flag(ops, "set_resolver_cache", "delete_resolver_cache", before.resolver_cache, after.resolver_cache);
    leaf(ops, "set_resolver_interval", "delete_resolver_interval", before.resolver_interval, after.resolver_interval);
    emitStatePolicy(ops, before, after);
    emitBridged(ops, before, after);
    emitGeoip(ops, before, after);
    emitTimeouts(ops, before, after);
  });
  return ops;
}
