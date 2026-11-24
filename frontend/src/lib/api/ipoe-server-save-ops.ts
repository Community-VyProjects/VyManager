/**
 * Batch ops for the IPoE server screen. Every modal diffs its draft against
 * the loaded config: a changed leaf is set, a cleared leaf is deleted, and an
 * untouched leaf emits nothing. The save checks and the emit read every value
 * through the same normalizers.
 */
import type {
  BatchOperation,
  IPoEAuthMac,
  IPoEConfigResponse,
  IPoEInterface,
  IPoERadiusServer,
  IPoERadiusSettings,
  IPoEClientIPPool,
  IPoEClientIPv6Pool,
} from "./ipoe-server";

/** Request item for global ops; the builder ignores it. */
export const GLOBAL_ITEM = "ipoe";

/** Text leaf as both the save checks and the emit read it. */
export function text(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/** Secret as both the save checks and the emit read it; never trimmed. */
function secret(value: string | null | undefined): string {
  return value ?? "";
}

/** Trimmed, non-empty, de-duplicated list in input order. */
function list(values: (string | null | undefined)[] | null | undefined): string[] {
  const out: string[] = [];
  for (const value of values ?? []) {
    const v = text(value);
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

/**
 * Single-value leaf: set when changed, delete when cleared. `prefix` is the
 * leading value part an op takes before the leaf value (a MAC address); the
 * delete then takes only that part.
 */
function leaf(
  ops: BatchOperation[],
  setOp: string,
  deleteOp: string,
  before: string | null | undefined,
  after: string | null | undefined,
  prefix?: string,
): void {
  const b = text(before);
  const a = text(after);
  if (a === b) return;
  if (a) ops.push({ op: setOp, value: prefix ? `${prefix}|${a}` : a });
  else ops.push(prefix ? { op: deleteOp, value: prefix } : { op: deleteOp });
}

/** Valueless leaf: set when turned on, delete when turned off. */
function flag(ops: BatchOperation[], setOp: string, deleteOp: string, before: boolean, after: boolean): void {
  if (before === after) return;
  ops.push({ op: after ? setOp : deleteOp });
}

/**
 * `multi:` leaf: delete each removed value and set each added one. With
 * `deleteAllOp`, an emptied list deletes the node once instead.
 */
function multi(
  ops: BatchOperation[],
  setOp: string,
  deleteOp: string,
  before: string[] | null | undefined,
  after: string[],
  deleteAllOp?: string,
): void {
  const b = list(before);
  const a = list(after);
  const removed = b.filter((v) => !a.includes(v));
  if (deleteAllOp && a.length === 0 && b.length > 0) {
    ops.push({ op: deleteAllOp });
  } else {
    for (const v of removed) ops.push({ op: deleteOp, value: v });
  }
  for (const v of a) {
    if (!b.includes(v)) ops.push({ op: setOp, value: v });
  }
}

/**
 * A plain section whose bare node turns a module on (shaper, limits, snmp).
 * `leaves` emits the child diffs; the section set is sent only when it turns
 * on with no child set in the same batch, and turning it off deletes the
 * section alone.
 */
function section(
  ops: BatchOperation[],
  setOp: string,
  deleteOp: string,
  before: boolean,
  after: boolean,
  leaves: () => BatchOperation[],
): void {
  if (!after) {
    if (before) ops.push({ op: deleteOp });
    return;
  }
  const children = leaves();
  if (!before && !children.some((op) => op.op.startsWith("set_"))) ops.push({ op: setOp });
  ops.push(...children);
}

// ============================================================================
// General settings
// ============================================================================

export interface IPoEGeneralDraft {
  description: string;
  default_pool: string;
  default_ipv6_pool: string;
  gateway_addresses: string[];
  name_servers: string[];
  max_concurrent_sessions: string;
  thread_count: string;
  lua_file: string;
  idle_timeout: string;
}

export function generalOps(
  current: IPoEConfigResponse,
  draft: IPoEGeneralDraft,
  idleTimeoutSupported: boolean,
): BatchOperation[] {
  const ops: BatchOperation[] = [];
  leaf(ops, "set_description", "delete_description", current.description, draft.description);
  leaf(ops, "set_default_pool", "delete_default_pool", current.default_pool, draft.default_pool);
  leaf(ops, "set_default_ipv6_pool", "delete_default_ipv6_pool", current.default_ipv6_pool, draft.default_ipv6_pool);
  multi(ops, "set_gateway_address", "delete_gateway_address", current.gateway_addresses, draft.gateway_addresses,
    "delete_all_gateway_addresses");
  multi(ops, "set_name_server", "delete_name_server", current.name_servers, draft.name_servers);
  leaf(ops, "set_max_concurrent_sessions", "delete_max_concurrent_sessions",
    current.max_concurrent_sessions, draft.max_concurrent_sessions);
  leaf(ops, "set_thread_count", "delete_thread_count", current.thread_count, draft.thread_count);
  leaf(ops, "set_lua_file", "delete_lua_file", current.lua_file, draft.lua_file);
  if (idleTimeoutSupported) {
    leaf(ops, "set_idle_timeout", "delete_idle_timeout", current.idle_timeout, draft.idle_timeout);
  }
  return ops;
}

// ============================================================================
// Authentication mode
// ============================================================================

/** An empty draft mode deletes the leaf, so the lab default applies. */
export function authModeOps(current: string | null | undefined, draft: string): BatchOperation[] {
  const ops: BatchOperation[] = [];
  leaf(ops, "set_auth_mode", "delete_auth_mode", current, draft);
  return ops;
}

// ============================================================================
// Server interfaces
// ============================================================================

export interface IPoEInterfaceDraft {
  interface: string;
  mode: string;
  network: string;
  start_session: string;
  client_subnet: string;
  vlans: string[];
  vlan_mon: boolean;
  lua_username: string;
  dhcp_relay: string;
  giaddr: string;
}

export type IPoEInterfaceProblem =
  | "interfaceRequired"
  | "interfaceExists"
  | "subnetWithVlan"
  | "vlanMonWithoutVlan"
  | "relayWithoutGiaddr";

/** Combinations the lab commit rejects (service_ipoe-server.py verify). */
export function interfaceProblem(
  current: IPoEInterface | null,
  draft: IPoEInterfaceDraft,
  configured: string[],
): IPoEInterfaceProblem | null {
  const name = text(draft.interface);
  if (!name) return "interfaceRequired";
  if (!current && configured.includes(name)) return "interfaceExists";
  const vlans = list(draft.vlans);
  if (text(draft.client_subnet) && vlans.length > 0) return "subnetWithVlan";
  if (draft.vlan_mon && vlans.length === 0) return "vlanMonWithoutVlan";
  if (text(draft.dhcp_relay) && !text(draft.giaddr)) return "relayWithoutGiaddr";
  return null;
}

/** Ops for one interface; `current` null creates it. The item is the interface. */
export function interfaceOps(
  current: IPoEInterface | null,
  draft: IPoEInterfaceDraft,
  vlanMonSupported: boolean,
): BatchOperation[] {
  const ops: BatchOperation[] = [];
  if (!current) ops.push({ op: "create_interface" });
  leaf(ops, "set_interface_mode", "delete_interface_mode", current?.mode, draft.mode);
  leaf(ops, "set_interface_network", "delete_interface_network", current?.network, draft.network);
  leaf(ops, "set_interface_start_session", "delete_interface_start_session", current?.start_session, draft.start_session);
  leaf(ops, "set_interface_client_subnet", "delete_interface_client_subnet", current?.client_subnet, draft.client_subnet);
  if (vlanMonSupported) {
    flag(ops, "set_interface_vlan_mon", "delete_interface_vlan_mon", !!current?.vlan_mon, draft.vlan_mon);
  }
  multi(ops, "set_interface_vlan", "delete_interface_vlan", current?.vlans, draft.vlans, "delete_interface_all_vlans");
  leaf(ops, "set_interface_lua_username", "delete_interface_lua_username", current?.lua_username, draft.lua_username);
  const relay = current?.external_dhcp?.dhcp_relay;
  const giaddr = current?.external_dhcp?.giaddr;
  if (!text(draft.dhcp_relay) && !text(draft.giaddr)) {
    if (current?.external_dhcp) ops.push({ op: "delete_interface_external_dhcp" });
  } else {
    leaf(ops, "set_interface_external_dhcp_relay", "delete_interface_external_dhcp_relay", relay, draft.dhcp_relay);
    leaf(ops, "set_interface_external_dhcp_giaddr", "delete_interface_external_dhcp_giaddr", giaddr, draft.giaddr);
  }
  return ops;
}

// ============================================================================
// Local MAC authentication
// ============================================================================

export interface IPoEAuthMacDraft {
  interface: string;
  mac: string;
  ip_address: string;
  vlan: string;
  rate_download: string;
  rate_upload: string;
}

export type IPoEAuthMacProblem = "interfaceRequired" | "macRequired" | "macExists";

export function authMacProblem(
  current: IPoEAuthMac | null,
  draft: IPoEAuthMacDraft,
  configured: string[],
): IPoEAuthMacProblem | null {
  if (!text(draft.interface)) return "interfaceRequired";
  const mac = text(draft.mac);
  if (!mac) return "macRequired";
  if (!current && configured.some((m) => m.toLowerCase() === mac.toLowerCase())) return "macExists";
  return null;
}

/** Ops for one MAC entry; `current` null creates it. The item is the interface. */
export function authMacOps(current: IPoEAuthMac | null, draft: IPoEAuthMacDraft): BatchOperation[] {
  const mac = current ? current.mac : text(draft.mac);
  const ops: BatchOperation[] = [];
  if (!current) ops.push({ op: "set_auth_interface_mac", value: mac });
  leaf(ops, "set_auth_mac_ip_address", "delete_auth_mac_ip_address", current?.ip_address, draft.ip_address, mac);
  leaf(ops, "set_auth_mac_vlan", "delete_auth_mac_vlan", current?.vlan, draft.vlan, mac);
  const rate = current?.rate_limit;
  if (!text(draft.rate_download) && !text(draft.rate_upload)) {
    // Both cleared: drop the rate-limit node instead of leaving it empty.
    if (text(rate?.download) || text(rate?.upload)) ops.push({ op: "delete_auth_mac_rate_limit", value: mac });
  } else {
    leaf(ops, "set_auth_mac_rate_limit_download", "delete_auth_mac_rate_limit_download",
      rate?.download, draft.rate_download, mac);
    leaf(ops, "set_auth_mac_rate_limit_upload", "delete_auth_mac_rate_limit_upload",
      rate?.upload, draft.rate_upload, mac);
  }
  return ops;
}

// ============================================================================
// RADIUS servers
// ============================================================================

export interface IPoERadiusServerDraft {
  address: string;
  /** Blank keeps the stored key; the lab requires one, so it has no delete. */
  key: string;
  port: string;
  acct_port: string;
  priority: string;
  fail_time: string;
  disabled: boolean;
  backup: boolean;
  disable_accounting: boolean;
}

export type IPoERadiusServerProblem = "addressRequired" | "addressExists" | "keyRequired";

export function radiusServerProblem(
  current: IPoERadiusServer | null,
  draft: IPoERadiusServerDraft,
  configured: string[],
): IPoERadiusServerProblem | null {
  const address = text(draft.address);
  if (!address) return "addressRequired";
  if (!current && configured.includes(address)) return "addressExists";
  if (!current?.key && !secret(draft.key)) return "keyRequired";
  return null;
}

/** Ops for one server; `current` null creates it. The item is the address. */
export function radiusServerOps(current: IPoERadiusServer | null, draft: IPoERadiusServerDraft): BatchOperation[] {
  const ops: BatchOperation[] = [];
  if (!current) ops.push({ op: "set_radius_server" });
  const key = secret(draft.key);
  if (key) ops.push({ op: "set_radius_server_key", value: key });
  leaf(ops, "set_radius_server_port", "delete_radius_server_port", current?.port, draft.port);
  leaf(ops, "set_radius_server_acct_port", "delete_radius_server_acct_port", current?.acct_port, draft.acct_port);
  leaf(ops, "set_radius_server_priority", "delete_radius_server_priority", current?.priority, draft.priority);
  leaf(ops, "set_radius_server_fail_time", "delete_radius_server_fail_time", current?.fail_time, draft.fail_time);
  flag(ops, "set_radius_server_disable", "delete_radius_server_disable", !!current?.disabled, draft.disabled);
  flag(ops, "set_radius_server_backup", "delete_radius_server_backup", !!current?.backup, draft.backup);
  flag(ops, "set_radius_server_disable_accounting", "delete_radius_server_disable_accounting",
    !!current?.disable_accounting, draft.disable_accounting);
  return ops;
}

// ============================================================================
// RADIUS global settings
// ============================================================================

export interface IPoERadiusSettingsDraft {
  source_address: string;
  timeout: string;
  max_try: string;
  nas_identifier: string;
  nas_ip_address: string;
  preallocate_vif: boolean;
  accounting_interim_interval: string;
  acct_interim_jitter: string;
  acct_timeout: string;
  dae_server: string;
  dae_port: string;
  /** Blank keeps the stored key. */
  dae_key: string;
  rate_limit_enable: boolean;
  rate_limit_attribute: string;
  rate_limit_vendor: string;
  rate_limit_multiplier: string;
}

export type IPoERadiusSettingsProblem = "daeKeyRequired";

export function radiusSettingsProblem(
  current: IPoERadiusSettings,
  draft: IPoERadiusSettingsDraft,
): IPoERadiusSettingsProblem | null {
  if (text(draft.dae_server) && !current.dynamic_author?.key && !secret(draft.dae_key)) return "daeKeyRequired";
  return null;
}

export function radiusSettingsOps(current: IPoERadiusSettings, draft: IPoERadiusSettingsDraft): BatchOperation[] {
  const ops: BatchOperation[] = [];
  leaf(ops, "set_radius_source_address", "delete_radius_source_address", current.source_address, draft.source_address);
  leaf(ops, "set_radius_timeout", "delete_radius_timeout", current.timeout, draft.timeout);
  leaf(ops, "set_radius_max_try", "delete_radius_max_try", current.max_try, draft.max_try);
  leaf(ops, "set_radius_nas_identifier", "delete_radius_nas_identifier", current.nas_identifier, draft.nas_identifier);
  leaf(ops, "set_radius_nas_ip_address", "delete_radius_nas_ip_address", current.nas_ip_address, draft.nas_ip_address);
  flag(ops, "set_radius_preallocate_vif", "delete_radius_preallocate_vif", !!current.preallocate_vif, draft.preallocate_vif);
  leaf(ops, "set_radius_accounting_interim_interval", "delete_radius_accounting_interim_interval",
    current.accounting_interim_interval, draft.accounting_interim_interval);
  leaf(ops, "set_radius_acct_interim_jitter", "delete_radius_acct_interim_jitter",
    current.acct_interim_jitter, draft.acct_interim_jitter);
  leaf(ops, "set_radius_acct_timeout", "delete_radius_acct_timeout", current.acct_timeout, draft.acct_timeout);

  const dae = current.dynamic_author;
  const daeKey = secret(draft.dae_key);
  const daeBefore = !!text(dae?.server) || !!text(dae?.port) || !!dae?.key;
  const daeAfter = !!text(draft.dae_server) || !!text(draft.dae_port) || !!daeKey;
  if (daeBefore && !daeAfter) {
    // Everything cleared: drop the node instead of leaving it empty.
    ops.push({ op: "delete_radius_dynamic_author" });
  } else {
    leaf(ops, "set_radius_dynamic_author_server", "delete_radius_dynamic_author_server", dae?.server, draft.dae_server);
    leaf(ops, "set_radius_dynamic_author_port", "delete_radius_dynamic_author_port", dae?.port, draft.dae_port);
    if (daeKey) ops.push({ op: "set_radius_dynamic_author_key", value: daeKey });
    // The key only serves the DAE server: clearing the server drops it too.
    else if (!text(draft.dae_server) && dae?.key) ops.push({ op: "delete_radius_dynamic_author_key" });
  }

  const rl = current.rate_limit;
  const rlBefore = !!rl?.enable || !!text(rl?.attribute) || !!text(rl?.vendor) || !!text(rl?.multiplier);
  const rlAfter = draft.rate_limit_enable || !!text(draft.rate_limit_attribute)
    || !!text(draft.rate_limit_vendor) || !!text(draft.rate_limit_multiplier);
  if (rlBefore && !rlAfter) {
    ops.push({ op: "delete_radius_rate_limit" });
  } else {
    flag(ops, "set_radius_rate_limit_enable", "delete_radius_rate_limit_enable", !!rl?.enable, draft.rate_limit_enable);
    leaf(ops, "set_radius_rate_limit_attribute", "delete_radius_rate_limit_attribute", rl?.attribute, draft.rate_limit_attribute);
    leaf(ops, "set_radius_rate_limit_vendor", "delete_radius_rate_limit_vendor", rl?.vendor, draft.rate_limit_vendor);
    leaf(ops, "set_radius_rate_limit_multiplier", "delete_radius_rate_limit_multiplier", rl?.multiplier, draft.rate_limit_multiplier);
  }
  return ops;
}

// ============================================================================
// Client IPv4 pools
// ============================================================================

export interface IPoEIPPoolDraft {
  name: string;
  ranges: string[];
  next_pool: string;
}

export type IPoEIPPoolProblem = "poolNameRequired" | "poolExists" | "nextPoolSelf";

export function ipPoolProblem(
  current: IPoEClientIPPool | null,
  draft: IPoEIPPoolDraft,
  configured: string[],
): IPoEIPPoolProblem | null {
  const name = text(draft.name);
  if (!name) return "poolNameRequired";
  if (!current && configured.includes(name)) return "poolExists";
  if (text(draft.next_pool) === name) return "nextPoolSelf";
  return null;
}

/** Ops for one pool; `current` null creates it. The item is the pool name. */
export function ipPoolOps(current: IPoEClientIPPool | null, draft: IPoEIPPoolDraft): BatchOperation[] {
  const ops: BatchOperation[] = [];
  if (!current) ops.push({ op: "create_pool" });
  multi(ops, "set_pool_range", "delete_pool_range", current?.ranges, draft.ranges);
  leaf(ops, "set_pool_next_pool", "delete_pool_next_pool", current?.next_pool, draft.next_pool);
  return ops;
}

// ============================================================================
// Client IPv6 pools
// ============================================================================

export interface IPoEIPv6PrefixRow {
  prefix: string;
  mask: string;
}

export interface IPoEIPv6DelegateRow {
  prefix: string;
  delegation_prefix: string;
}

export interface IPoEIPv6PoolDraft {
  name: string;
  prefixes: IPoEIPv6PrefixRow[];
  delegates: IPoEIPv6DelegateRow[];
}

export type IPoEIPv6PoolProblem =
  | "poolNameRequired"
  | "poolExists"
  | "prefixRequired"
  | "maskRequired"
  | "duplicatePrefix"
  | "delegateWithoutPrefix"
  | "delegatePrefixRequired"
  | "delegationPrefixRequired"
  | "duplicateDelegate";

/** A row the user added and never filled is dropped; any other row counts. */
function filled(a: string, b: string): boolean {
  return !!text(a) || !!text(b);
}

/** First trimmed value that appears twice, or null. */
function firstDuplicate(values: string[]): string | null {
  return values.find((value, index) => values.indexOf(value) !== index) ?? null;
}

/** A failed check and the prefix of the row it names ("" when none). */
export interface IPoEIPv6PoolIssue {
  problem: IPoEIPv6PoolProblem;
  prefix: string;
}

export function ipv6PoolProblem(
  current: IPoEClientIPv6Pool | null,
  draft: IPoEIPv6PoolDraft,
  configured: string[],
): IPoEIPv6PoolIssue | null {
  const name = text(draft.name);
  if (!name) return { problem: "poolNameRequired", prefix: "" };
  if (!current && configured.includes(name)) return { problem: "poolExists", prefix: "" };
  const prefixes = draft.prefixes.filter((row) => filled(row.prefix, row.mask));
  if (prefixes.some((row) => !text(row.prefix))) return { problem: "prefixRequired", prefix: "" };
  const noMask = prefixes.find((row) => !text(row.mask));
  if (noMask) return { problem: "maskRequired", prefix: text(noMask.prefix) };
  const duplicatePrefix = firstDuplicate(prefixes.map((row) => text(row.prefix)));
  if (duplicatePrefix) return { problem: "duplicatePrefix", prefix: duplicatePrefix };
  const delegates = draft.delegates.filter((row) => filled(row.prefix, row.delegation_prefix));
  // Lab verify: a delegate needs at least one prefix in the same pool.
  if (delegates.length > 0 && prefixes.length === 0) return { problem: "delegateWithoutPrefix", prefix: "" };
  if (delegates.some((row) => !text(row.prefix))) return { problem: "delegatePrefixRequired", prefix: "" };
  const noLength = delegates.find((row) => !text(row.delegation_prefix));
  if (noLength) return { problem: "delegationPrefixRequired", prefix: text(noLength.prefix) };
  const duplicateDelegate = firstDuplicate(delegates.map((row) => text(row.prefix)));
  if (duplicateDelegate) return { problem: "duplicateDelegate", prefix: duplicateDelegate };
  return null;
}

/**
 * Ops for one IPv6 pool; `current` null creates it. A prefix or delegate is
 * keyed by its trimmed prefix: a removed one is deleted, a new or changed one
 * is set (the set replaces its single mask or delegation length).
 */
export function ipv6PoolOps(current: IPoEClientIPv6Pool | null, draft: IPoEIPv6PoolDraft): BatchOperation[] {
  const ops: BatchOperation[] = [];
  if (!current) ops.push({ op: "create_ipv6_pool" });

  const prefixesBefore = new Map((current?.prefixes ?? []).map((p) => [text(p.prefix), text(p.mask)]));
  const prefixesAfter = new Map(
    draft.prefixes.filter((row) => text(row.prefix)).map((row) => [text(row.prefix), text(row.mask)]),
  );
  for (const prefix of prefixesBefore.keys()) {
    if (!prefixesAfter.has(prefix)) ops.push({ op: "delete_ipv6_pool_prefix", value: prefix });
  }
  for (const [prefix, mask] of prefixesAfter) {
    if (prefixesBefore.get(prefix) !== mask) ops.push({ op: "set_ipv6_pool_prefix", value: `${prefix}|${mask}` });
  }

  const delegatesBefore = new Map((current?.delegates ?? []).map((d) => [text(d.prefix), text(d.delegation_prefix)]));
  const delegatesAfter = new Map(
    draft.delegates.filter((row) => text(row.prefix)).map((row) => [text(row.prefix), text(row.delegation_prefix)]),
  );
  for (const prefix of delegatesBefore.keys()) {
    if (!delegatesAfter.has(prefix)) ops.push({ op: "delete_ipv6_pool_delegate", value: prefix });
  }
  for (const [prefix, length] of delegatesAfter) {
    if (delegatesBefore.get(prefix) !== length) {
      ops.push({ op: "set_ipv6_pool_delegate", value: `${prefix}|${length}` });
    }
  }
  return ops;
}

// ============================================================================
// Advanced settings
// ============================================================================

export interface IPoEAdvancedDraft {
  log_level: string;
  shaper_enabled: boolean;
  shaper_fwmark: string;
  snmp_enabled: boolean;
  snmp_master_agent: boolean;
  limits_enabled: boolean;
  limits_burst: string;
  limits_connection_limit: string;
  limits_timeout: string;
  scripts_on_change: string;
  scripts_on_down: string;
  scripts_on_pre_up: string;
  scripts_on_up: string;
}

export function advancedOps(current: IPoEConfigResponse, draft: IPoEAdvancedDraft): BatchOperation[] {
  const ops: BatchOperation[] = [];
  leaf(ops, "set_log_level", "delete_log_level", current.log?.level, draft.log_level);

  const shaper = current.shaper;
  section(ops, "set_shaper", "delete_shaper", !!shaper?.enabled, draft.shaper_enabled, () => {
    const children: BatchOperation[] = [];
    leaf(children, "set_shaper_fwmark", "delete_shaper_fwmark", shaper?.fwmark, draft.shaper_fwmark);
    return children;
  });

  const snmp = current.snmp;
  section(ops, "set_snmp", "delete_snmp", !!snmp?.enabled, draft.snmp_enabled, () => {
    const children: BatchOperation[] = [];
    flag(children, "set_snmp_master_agent", "delete_snmp_master_agent", !!snmp?.master_agent, draft.snmp_master_agent);
    return children;
  });

  const limits = current.limits;
  section(ops, "set_limits", "delete_limits", !!limits?.enabled, draft.limits_enabled, () => {
    const children: BatchOperation[] = [];
    leaf(children, "set_limits_burst", "delete_limits_burst", limits?.burst, draft.limits_burst);
    leaf(children, "set_limits_connection_limit", "delete_limits_connection_limit",
      limits?.connection_limit, draft.limits_connection_limit);
    leaf(children, "set_limits_timeout", "delete_limits_timeout", limits?.timeout, draft.limits_timeout);
    return children;
  });

  const scripts = current.extended_scripts;
  leaf(ops, "set_script_on_change", "delete_script_on_change", scripts?.on_change, draft.scripts_on_change);
  leaf(ops, "set_script_on_down", "delete_script_on_down", scripts?.on_down, draft.scripts_on_down);
  leaf(ops, "set_script_on_pre_up", "delete_script_on_pre_up", scripts?.on_pre_up, draft.scripts_on_pre_up);
  leaf(ops, "set_script_on_up", "delete_script_on_up", scripts?.on_up, draft.scripts_on_up);
  return ops;
}
