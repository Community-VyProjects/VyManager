/**
 * Batch ops for the PPPoE server screen. Every modal diffs its draft against
 * the loaded config: a changed leaf is set, a cleared leaf is deleted, and an
 * untouched leaf emits nothing. Each save is one batch. The save checks and
 * the emit read every value through the same normalizers.
 */
import type {
  BatchOperation,
  PPPoEAuthentication,
  PPPoEConfigResponse,
  PPPoEInterface,
  PPPoEIPv4Pool,
  PPPoEIPv6Pool,
  PPPoELocalUser,
  PPPoEPppOptions,
  PPPoERadiusServer,
  PPPoERadiusSettings,
} from "./pppoe-server";

/** Request item for global ops; the builder ignores it. */
export const GLOBAL_ITEM = "pppoe";

/** What the config response returns for a stored secret. */
export const MASKED_SECRET = "***";

/** A failed save check: a message key and the values its text names. */
export interface SaveIssue<K extends string> {
  problem: K;
  params: Record<string, string | number>;
}

function issue<K extends string>(problem: K, params: Record<string, string | number> = {}): SaveIssue<K> {
  return { problem, params };
}

// ============================================================================
// Lab ranges (val_help) the capabilities do not carry
// ============================================================================

export interface NumberRange {
  min: number;
  max: number;
}

export const PPPOE_RANGES = {
  mtu: { min: 128, max: 16384 },
  maxConcurrentSessions: { min: 0, max: 65535 },
  threadCount: { min: 1, max: 512 },
  padoDelay: { min: 1, max: 999999 },
  padoSessions: { min: 1, max: 999999 },
  interfaceCache: { min: 1, max: 256000 },
  pppMinMtu: { min: 68, max: 65535 },
  pppMru: { min: 68, max: 65535 },
  shaperFwmark: { min: 1, max: 2147483647 },
  vlan: { min: 1, max: 4094 },
  ipv6PrefixMask: { min: 48, max: 128 },
  ipv6DelegationPrefix: { min: 32, max: 64 },
  radiusTimeout: { min: 1, max: 60 },
  radiusMaxTry: { min: 1, max: 20 },
  radiusAcctInterimInterval: { min: 1, max: 3600 },
  radiusAcctInterimJitter: { min: 1, max: 60 },
  radiusAcctTimeout: { min: 0, max: 60 },
  radiusRateLimitMultiplier: { min: 0.001, max: 1000 },
  port: { min: 1, max: 65535 },
  radiusFailTime: { min: 0, max: 600 },
  radiusPriority: { min: 1, max: 255 },
  /** ppp-options ipv6-peer-interface-id-secret length (1.5). */
  peerInterfaceIdSecret: { min: 16, max: 128 },
} as const satisfies Record<string, NumberRange>;

/**
 * Lower bounds of leaves the lab validates as `numeric --positive` (no upper
 * bound): ppp-options lcp-echo-failure, lcp-echo-interval, lcp-echo-timeout.
 */
export const PPPOE_MINIMUMS = {
  lcpEcho: 1,
} as const satisfies Record<string, number>;

/** limits connection-limit: lab regex `[0-9]+/(min|sec)`, matched whole. */
export const CONNECTION_LIMIT_PATTERN = /^[0-9]+\/(min|sec)$/;

/** The pado-delay keyword that stops answering PADI. */
export const PADO_DISABLE = "disable";

/** The peer-interface-id keyword that needs the secret on 1.5. */
export const CALLING_SID = "calling-sid";

// ============================================================================
// Normalizers and emit helpers
// ============================================================================

/** Text leaf as both the save checks and the emit read it. */
export function text(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/**
 * Secret as both the save checks and the emit read it: never trimmed, and a
 * blank one counts as not typed (the router rejects a blank value).
 */
function secret(value: string | null | undefined): string {
  const v = value ?? "";
  return v.trim() ? v : "";
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

/** Whole number (no sign, exponent or fraction) inside the range. */
function wholeInRange(value: string, range: NumberRange): boolean {
  if (!/^\d+$/.test(value)) return false;
  const n = Number(value);
  return n >= range.min && n <= range.max;
}

/** Plain decimal (no sign or exponent) inside the range. */
function decimalInRange(value: string, range: NumberRange): boolean {
  if (!/^\d+(\.\d+)?$/.test(value)) return false;
  const n = Number(value);
  return n >= range.min && n <= range.max;
}

/** A filled value outside the range, as a keyed issue naming the bounds. */
function rangeIssue<K extends string>(
  problem: K,
  value: string | null | undefined,
  range: NumberRange,
  extra: Record<string, string | number> = {},
): SaveIssue<K> | null {
  const v = text(value);
  if (!v || wholeInRange(v, range)) return null;
  return issue(problem, { min: range.min, max: range.max, ...extra });
}

/** A filled value that is not a whole number of at least `min`, as a keyed issue. */
function minimumIssue<K extends string>(problem: K, value: string | null | undefined, min: number): SaveIssue<K> | null {
  const v = text(value);
  if (!v || (/^\d+$/.test(v) && Number(v) >= min)) return null;
  return issue(problem, { min });
}

/** Single-value leaf: set when changed, delete when cleared. */
function leaf(
  ops: BatchOperation[],
  setOp: string,
  deleteOp: string,
  before: string | null | undefined,
  after: string | null | undefined,
): void {
  const b = text(before);
  const a = text(after);
  if (a === b) return;
  ops.push(a ? { op: setOp, value: a } : { op: deleteOp });
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
  if (deleteAllOp && a.length === 0 && b.length > 0) {
    ops.push({ op: deleteAllOp });
  } else {
    for (const v of b) {
      if (!a.includes(v)) ops.push({ op: deleteOp, value: v });
    }
  }
  for (const v of a) {
    if (!b.includes(v)) ops.push({ op: setOp, value: v });
  }
}

/**
 * A plain section whose bare node turns a module on (shaper, snmp, limits,
 * extended-scripts). `leaves` emits the child diffs; the section set is sent
 * only when it turns on with no child set in the same batch, and turning it
 * off deletes the section alone.
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

/**
 * Optional secret loaded as the mask: the untouched mask skips, a cleared
 * field deletes, and new text sets.
 */
function optionalSecret(
  ops: BatchOperation[],
  setOp: string,
  deleteOp: string,
  stored: string | null | undefined,
  draft: string,
): void {
  if (stored && draft === MASKED_SECRET) return;
  const typed = secret(draft);
  if (typed) ops.push({ op: setOp, value: typed });
  else if (stored) ops.push({ op: deleteOp });
}

/** A typed secret equal to the mask while nothing is stored would never be sent. */
function typedMask(stored: string | null | undefined, draft: string): boolean {
  return !stored && draft === MASKED_SECRET;
}

/** First trimmed value that appears twice, or null. */
function firstDuplicate(values: string[]): string | null {
  return values.find((value, index) => values.indexOf(value) !== index) ?? null;
}

// ============================================================================
// General settings
// ============================================================================

export interface PPPoEGeneralDraft {
  description: string;
  access_concentrator: string;
  service_names: string[];
  gateway_address: string;
  name_servers: string[];
  wins_servers: string[];
  mtu: string;
  max_concurrent_sessions: string;
  thread_count: string;
  default_pool: string;
  default_ipv6_pool: string;
  session_control: string;
  accept_any_service: boolean;
  accept_blank_service: boolean;
}

export type PPPoEGeneralProblem =
  | "mtuRange"
  | "maxSessionsRange"
  | "threadCountInvalid"
  | "tooManyIpv4NameServers"
  | "tooManyIpv6NameServers"
  | "tooManyWinsServers";

/** Lab verify limits on resolver lists (accel_ppp_util). */
export const NAME_SERVER_LIMITS = { ipv4: 2, ipv6: 3, wins: 2 } as const;

export function generalProblem(
  draft: PPPoEGeneralDraft,
  threadCountKeywords: string[],
): SaveIssue<PPPoEGeneralProblem> | null {
  const ranged = rangeIssue("mtuRange", draft.mtu, PPPOE_RANGES.mtu)
    ?? rangeIssue("maxSessionsRange", draft.max_concurrent_sessions, PPPOE_RANGES.maxConcurrentSessions);
  if (ranged) return ranged;
  const threads = text(draft.thread_count);
  if (threads && !threadCountKeywords.includes(threads) && !wholeInRange(threads, PPPOE_RANGES.threadCount)) {
    return issue("threadCountInvalid", { ...PPPOE_RANGES.threadCount });
  }
  const servers = list(draft.name_servers);
  if (servers.filter((s) => !s.includes(":")).length > NAME_SERVER_LIMITS.ipv4) {
    return issue("tooManyIpv4NameServers", { max: NAME_SERVER_LIMITS.ipv4 });
  }
  if (servers.filter((s) => s.includes(":")).length > NAME_SERVER_LIMITS.ipv6) {
    return issue("tooManyIpv6NameServers", { max: NAME_SERVER_LIMITS.ipv6 });
  }
  if (list(draft.wins_servers).length > NAME_SERVER_LIMITS.wins) {
    return issue("tooManyWinsServers", { max: NAME_SERVER_LIMITS.wins });
  }
  return null;
}

export function generalOps(current: PPPoEConfigResponse, draft: PPPoEGeneralDraft): BatchOperation[] {
  const ops: BatchOperation[] = [];
  leaf(ops, "set_description", "delete_description", current.description, draft.description);
  leaf(ops, "set_access_concentrator", "delete_access_concentrator", current.access_concentrator, draft.access_concentrator);
  multi(ops, "set_service_name", "delete_service_name", current.service_names, draft.service_names);
  leaf(ops, "set_gateway_address", "delete_gateway_address", current.gateway_address, draft.gateway_address);
  multi(ops, "set_name_server", "delete_name_server", current.name_servers, draft.name_servers);
  multi(ops, "set_wins_server", "delete_wins_server", current.wins_servers, draft.wins_servers);
  leaf(ops, "set_mtu", "delete_mtu", current.mtu, draft.mtu);
  leaf(ops, "set_max_concurrent_sessions", "delete_max_concurrent_sessions",
    current.max_concurrent_sessions, draft.max_concurrent_sessions);
  leaf(ops, "set_thread_count", "delete_thread_count", current.thread_count, draft.thread_count);
  leaf(ops, "set_default_pool", "delete_default_pool", current.default_pool, draft.default_pool);
  leaf(ops, "set_default_ipv6_pool", "delete_default_ipv6_pool", current.default_ipv6_pool, draft.default_ipv6_pool);
  leaf(ops, "set_session_control", "delete_session_control", current.session_control, draft.session_control);
  flag(ops, "set_accept_any_service", "delete_accept_any_service", current.accept_any_service, draft.accept_any_service);
  flag(ops, "set_accept_blank_service", "delete_accept_blank_service",
    current.accept_blank_service, draft.accept_blank_service);
  return ops;
}

// ============================================================================
// Authentication mode and protocols
// ============================================================================

export interface PPPoEAuthDraft {
  /** Empty deletes the leaf, so the lab default applies. */
  mode: string;
  protocols: string[];
  any_login: boolean;
}

export type PPPoEAuthProblem = "localModeNeedsUser" | "radiusModeNeedsServer";

/**
 * Lab verify: local mode needs a local user, radius mode a server. An unset
 * mode is the lab default, local, and fails verify the same way; any-login
 * does not exempt it.
 */
export function authProblem(current: PPPoEAuthentication, draft: PPPoEAuthDraft): SaveIssue<PPPoEAuthProblem> | null {
  const mode = text(draft.mode) || "local";
  if (mode === "local" && current.local_users.length === 0) return issue("localModeNeedsUser");
  if (mode === "radius" && current.radius.servers.length === 0) return issue("radiusModeNeedsServer");
  return null;
}

export function authOps(current: PPPoEAuthentication, draft: PPPoEAuthDraft, anyLoginSupported: boolean): BatchOperation[] {
  const ops: BatchOperation[] = [];
  leaf(ops, "set_auth_mode", "delete_auth_mode", current.mode, draft.mode);
  multi(ops, "set_auth_protocol", "delete_auth_protocol", current.protocols, draft.protocols, "delete_all_auth_protocols");
  if (anyLoginSupported) {
    flag(ops, "set_auth_any_login", "delete_auth_any_login", current.any_login, draft.any_login);
  }
  return ops;
}

// ============================================================================
// Local users
// ============================================================================

export interface PPPoELocalUserDraft {
  username: string;
  /** Blank keeps the stored password; the lab requires one, so it has no delete. */
  password: string;
  static_ip: string;
  rate_download: string;
  rate_upload: string;
  disabled: boolean;
}

export type PPPoELocalUserProblem =
  | "usernameRequired"
  | "userExists"
  | "passwordRequired"
  | "passwordIsMask"
  | "rateLimitBothDirections";

export function localUserProblem(
  current: PPPoELocalUser | null,
  draft: PPPoELocalUserDraft,
  configured: string[],
): SaveIssue<PPPoELocalUserProblem> | null {
  const username = text(draft.username);
  if (!username) return issue("usernameRequired");
  if (!current && configured.includes(username)) return issue("userExists", { username });
  if (typedMask(null, draft.password)) return issue("passwordIsMask");
  if (!current?.password && !secret(draft.password)) return issue("passwordRequired");
  // Lab verify: a rate limit needs both directions.
  if (!text(draft.rate_download) !== !text(draft.rate_upload)) return issue("rateLimitBothDirections");
  return null;
}

/** Ops for one user; `current` null creates it. The item is the username. */
export function localUserOps(current: PPPoELocalUser | null, draft: PPPoELocalUserDraft): BatchOperation[] {
  const ops: BatchOperation[] = [];
  if (!current) ops.push({ op: "create_local_user" });
  const password = secret(draft.password);
  if (password) ops.push({ op: "set_local_user_password", value: password });
  leaf(ops, "set_local_user_static_ip", "delete_local_user_static_ip", current?.static_ip, draft.static_ip);
  const hadRate = !!text(current?.rate_limit.download) || !!text(current?.rate_limit.upload);
  if (hadRate && !text(draft.rate_download) && !text(draft.rate_upload)) {
    // Lab verify rejects the empty `rate-limit {}` both leaf deletes leave behind.
    ops.push({ op: "delete_local_user_rate_limit" });
  } else {
    leaf(ops, "set_local_user_rate_limit_download", "delete_local_user_rate_limit_download",
      current?.rate_limit.download, draft.rate_download);
    leaf(ops, "set_local_user_rate_limit_upload", "delete_local_user_rate_limit_upload",
      current?.rate_limit.upload, draft.rate_upload);
  }
  flag(ops, "set_local_user_disable", "delete_local_user_disable", !!current?.disabled, draft.disabled);
  return ops;
}

// ============================================================================
// RADIUS servers
// ============================================================================

export interface PPPoERadiusServerDraft {
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

export type PPPoERadiusServerProblem =
  | "addressRequired"
  | "addressExists"
  | "keyRequired"
  | "keyIsMask"
  | "portRange"
  | "acctPortRange"
  | "priorityRange"
  | "failTimeRange";

export function radiusServerProblem(
  current: PPPoERadiusServer | null,
  draft: PPPoERadiusServerDraft,
  configured: string[],
): SaveIssue<PPPoERadiusServerProblem> | null {
  const address = text(draft.address);
  if (!address) return issue("addressRequired");
  if (!current && configured.includes(address)) return issue("addressExists", { address });
  if (typedMask(null, draft.key)) return issue("keyIsMask");
  if (!current?.key && !secret(draft.key)) return issue("keyRequired");
  return rangeIssue("portRange", draft.port, PPPOE_RANGES.port)
    ?? rangeIssue("acctPortRange", draft.acct_port, PPPOE_RANGES.port)
    ?? rangeIssue("priorityRange", draft.priority, PPPOE_RANGES.radiusPriority)
    ?? rangeIssue("failTimeRange", draft.fail_time, PPPOE_RANGES.radiusFailTime);
}

/** Ops for one server; `current` null creates it. The item is the address. */
export function radiusServerOps(current: PPPoERadiusServer | null, draft: PPPoERadiusServerDraft): BatchOperation[] {
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

export interface PPPoERadiusSettingsDraft {
  source_address: string;
  timeout: string;
  max_try: string;
  nas_identifier: string;
  nas_ip_address: string;
  preallocate_vif: boolean;
  accounting_interim_interval: string;
  acct_interim_jitter: string;
  acct_timeout: string;
  called_sid_format: string;
  dae_server: string;
  dae_port: string;
  /** Loaded as the mask when stored: the mask keeps it, blank deletes it. */
  dae_key: string;
  rate_limit_enable: boolean;
  rate_limit_attribute: string;
  rate_limit_vendor: string;
  rate_limit_multiplier: string;
}

export type PPPoERadiusSettingsProblem =
  | "timeoutRange"
  | "maxTryRange"
  | "interimIntervalRange"
  | "interimJitterRange"
  | "acctTimeoutRange"
  | "daePortRange"
  | "daeKeyIsMask"
  | "daeKeyRequired"
  | "multiplierRange";

export function radiusSettingsProblem(
  current: PPPoERadiusSettings,
  draft: PPPoERadiusSettingsDraft,
): SaveIssue<PPPoERadiusSettingsProblem> | null {
  const ranged = rangeIssue("timeoutRange", draft.timeout, PPPOE_RANGES.radiusTimeout)
    ?? rangeIssue("maxTryRange", draft.max_try, PPPOE_RANGES.radiusMaxTry)
    ?? rangeIssue("interimIntervalRange", draft.accounting_interim_interval, PPPOE_RANGES.radiusAcctInterimInterval)
    ?? rangeIssue("interimJitterRange", draft.acct_interim_jitter, PPPOE_RANGES.radiusAcctInterimJitter)
    ?? rangeIssue("acctTimeoutRange", draft.acct_timeout, PPPOE_RANGES.radiusAcctTimeout);
  if (ranged) return ranged;
  // Without a server the port and key are deleted (see radiusSettingsOps), so
  // only a DAE server's port and key are checked.
  if (text(draft.dae_server)) {
    const port = rangeIssue("daePortRange", draft.dae_port, PPPOE_RANGES.port);
    if (port) return port;
    if (typedMask(current.dynamic_author.key, draft.dae_key)) return issue("daeKeyIsMask");
    // Lab verify: a DAE server needs a key.
    if (!secret(draft.dae_key)) return issue("daeKeyRequired");
  }
  const multiplier = text(draft.rate_limit_multiplier);
  if (multiplier && !decimalInRange(multiplier, PPPOE_RANGES.radiusRateLimitMultiplier)) {
    return issue("multiplierRange", { ...PPPOE_RANGES.radiusRateLimitMultiplier });
  }
  return null;
}

export function radiusSettingsOps(current: PPPoERadiusSettings, draft: PPPoERadiusSettingsDraft): BatchOperation[] {
  const ops: BatchOperation[] = [];
  leaf(ops, "set_radius_source_address", "delete_radius_source_address", current.source_address, draft.source_address);
  leaf(ops, "set_radius_timeout", "delete_radius_timeout", current.timeout, draft.timeout);
  leaf(ops, "set_radius_max_try", "delete_radius_max_try", current.max_try, draft.max_try);
  leaf(ops, "set_radius_nas_identifier", "delete_radius_nas_identifier", current.nas_identifier, draft.nas_identifier);
  leaf(ops, "set_radius_nas_ip_address", "delete_radius_nas_ip_address", current.nas_ip_address, draft.nas_ip_address);
  flag(ops, "set_radius_preallocate_vif", "delete_radius_preallocate_vif", current.preallocate_vif, draft.preallocate_vif);
  leaf(ops, "set_radius_accounting_interim_interval", "delete_radius_accounting_interim_interval",
    current.accounting_interim_interval, draft.accounting_interim_interval);
  leaf(ops, "set_radius_acct_interim_jitter", "delete_radius_acct_interim_jitter",
    current.acct_interim_jitter, draft.acct_interim_jitter);
  leaf(ops, "set_radius_acct_timeout", "delete_radius_acct_timeout", current.acct_timeout, draft.acct_timeout);
  leaf(ops, "set_radius_called_sid_format", "delete_radius_called_sid_format",
    current.called_sid_format, draft.called_sid_format);

  const dae = current.dynamic_author;
  if (text(draft.dae_server)) {
    leaf(ops, "set_radius_dynamic_author_server", "delete_radius_dynamic_author_server", dae.server, draft.dae_server);
    leaf(ops, "set_radius_dynamic_author_port", "delete_radius_dynamic_author_port", dae.port, draft.dae_port);
    optionalSecret(ops, "set_radius_dynamic_author_key", "delete_radius_dynamic_author_key", dae.key, draft.dae_key);
  } else {
    // Lab: deleting the server alone commits but leaves port and key behind,
    // so a cleared server deletes whichever of the three is stored.
    if (text(dae.server)) ops.push({ op: "delete_radius_dynamic_author_server" });
    if (text(dae.port)) ops.push({ op: "delete_radius_dynamic_author_port" });
    if (dae.key) ops.push({ op: "delete_radius_dynamic_author_key" });
  }

  const rl = current.rate_limit;
  const rlBefore = rl.enable || !!text(rl.attribute) || !!text(rl.vendor) || !!text(rl.multiplier);
  const rlAfter = draft.rate_limit_enable || !!text(draft.rate_limit_attribute)
    || !!text(draft.rate_limit_vendor) || !!text(draft.rate_limit_multiplier);
  if (rlBefore && !rlAfter) {
    // Everything cleared: drop the node instead of leaving it empty.
    ops.push({ op: "delete_radius_rate_limit" });
  } else {
    flag(ops, "set_radius_rate_limit_enable", "delete_radius_rate_limit_enable", rl.enable, draft.rate_limit_enable);
    leaf(ops, "set_radius_rate_limit_attribute", "delete_radius_rate_limit_attribute", rl.attribute, draft.rate_limit_attribute);
    leaf(ops, "set_radius_rate_limit_vendor", "delete_radius_rate_limit_vendor", rl.vendor, draft.rate_limit_vendor);
    leaf(ops, "set_radius_rate_limit_multiplier", "delete_radius_rate_limit_multiplier",
      rl.multiplier, draft.rate_limit_multiplier);
  }
  return ops;
}

// ============================================================================
// Client IPv4 pools
// ============================================================================

export interface PPPoEIPPoolDraft {
  name: string;
  ranges: string[];
  next_pool: string;
}

export type PPPoEIPPoolProblem = "poolNameRequired" | "poolExists" | "nextPoolWithoutRange";

export function ipPoolProblem(
  current: PPPoEIPv4Pool | null,
  draft: PPPoEIPPoolDraft,
  configured: string[],
): SaveIssue<PPPoEIPPoolProblem> | null {
  const name = text(draft.name);
  if (!name) return issue("poolNameRequired");
  if (!current && configured.includes(name)) return issue("poolExists", { name });
  // Lab verify: a pool with next-pool must contain a range.
  if (text(draft.next_pool) && list(draft.ranges).length === 0) return issue("nextPoolWithoutRange");
  return null;
}

/** Ops for one pool; `current` null creates it. The item is the pool name. */
export function ipPoolOps(current: PPPoEIPv4Pool | null, draft: PPPoEIPPoolDraft): BatchOperation[] {
  const ops: BatchOperation[] = [];
  if (!current) ops.push({ op: "create_pool" });
  multi(ops, "set_pool_range", "delete_pool_range", current?.ranges, draft.ranges);
  leaf(ops, "set_pool_next_pool", "delete_pool_next_pool", current?.next_pool, draft.next_pool);
  return ops;
}

// ============================================================================
// Client IPv6 pools
// ============================================================================

export interface PPPoEIPv6PrefixRow {
  prefix: string;
  mask: string;
}

export interface PPPoEIPv6DelegateRow {
  prefix: string;
  delegation_prefix: string;
}

export interface PPPoEIPv6PoolDraft {
  name: string;
  prefixes: PPPoEIPv6PrefixRow[];
  delegates: PPPoEIPv6DelegateRow[];
}

export type PPPoEIPv6PoolProblem =
  | "poolNameRequired"
  | "poolExists"
  | "prefixRequired"
  | "prefixHasPipe"
  | "duplicatePrefix"
  | "maskRange"
  | "delegateWithoutPrefix"
  | "delegatePrefixRequired"
  | "delegatePrefixHasPipe"
  | "delegationPrefixRequired"
  | "delegationPrefixRange"
  | "duplicateDelegate";

/** A row the user added and never filled is dropped; any other row counts. */
function filled(a: string, b: string): boolean {
  return !!text(a) || !!text(b);
}

export function ipv6PoolProblem(
  current: PPPoEIPv6Pool | null,
  draft: PPPoEIPv6PoolDraft,
  configured: string[],
): SaveIssue<PPPoEIPv6PoolProblem> | null {
  const name = text(draft.name);
  if (!name) return issue("poolNameRequired");
  if (!current && configured.includes(name)) return issue("poolExists", { name });
  const prefixes = draft.prefixes.filter((row) => filled(row.prefix, row.mask));
  if (prefixes.some((row) => !text(row.prefix))) return issue("prefixRequired");
  // `|` separates the op's value parameters, so a prefix may not carry one.
  const pipedPrefix = prefixes.find((row) => text(row.prefix).includes("|"));
  if (pipedPrefix) return issue("prefixHasPipe", { prefix: text(pipedPrefix.prefix) });
  const duplicatePrefix = firstDuplicate(prefixes.map((row) => text(row.prefix)));
  if (duplicatePrefix) return issue("duplicatePrefix", { prefix: duplicatePrefix });
  for (const row of prefixes) {
    const bad = rangeIssue("maskRange", row.mask, PPPOE_RANGES.ipv6PrefixMask, { prefix: text(row.prefix) });
    if (bad) return bad;
  }
  const delegates = draft.delegates.filter((row) => filled(row.prefix, row.delegation_prefix));
  // Lab verify: a delegate needs at least one prefix in the same pool.
  if (delegates.length > 0 && prefixes.length === 0) return issue("delegateWithoutPrefix");
  if (delegates.some((row) => !text(row.prefix))) return issue("delegatePrefixRequired");
  const pipedDelegate = delegates.find((row) => text(row.prefix).includes("|"));
  if (pipedDelegate) return issue("delegatePrefixHasPipe", { prefix: text(pipedDelegate.prefix) });
  for (const row of delegates) {
    const prefix = text(row.prefix);
    if (!text(row.delegation_prefix)) return issue("delegationPrefixRequired", { prefix });
    const bad = rangeIssue("delegationPrefixRange", row.delegation_prefix, PPPOE_RANGES.ipv6DelegationPrefix, { prefix });
    if (bad) return bad;
  }
  const duplicateDelegate = firstDuplicate(delegates.map((row) => text(row.prefix)));
  if (duplicateDelegate) return issue("duplicateDelegate", { prefix: duplicateDelegate });
  return null;
}

/**
 * Ops for one IPv6 pool; `current` null creates it. A prefix or delegate is
 * keyed by its trimmed prefix: a removed one is deleted, a new or changed one
 * is set (the set replaces its single mask or delegation length). A prefix's
 * mask is optional (the lab default is 64): a cleared mask is deleted.
 */
export function ipv6PoolOps(current: PPPoEIPv6Pool | null, draft: PPPoEIPv6PoolDraft): BatchOperation[] {
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
    const before = prefixesBefore.get(prefix);
    if (before === mask) continue;
    if (mask) ops.push({ op: "set_ipv6_pool_prefix_mask", value: `${prefix}|${mask}` });
    else if (before === undefined) ops.push({ op: "set_ipv6_pool_prefix", value: prefix });
    else ops.push({ op: "delete_ipv6_pool_prefix_mask", value: prefix });
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
// Server interfaces
// ============================================================================

export interface PPPoEInterfaceDraft {
  interface: string;
  vlans: string[];
  vlan_mon: boolean;
  combined: boolean;
}

export type PPPoEInterfaceProblem = "interfaceRequired" | "vlanInvalid" | "vlanMonWithoutVlan";

/** A VLAN id or an ascending `start-end` range, both inside the lab range. */
export function isVlanValue(value: string): boolean {
  const v = text(value);
  const parts = v.split("-");
  if (parts.length > 2 || !parts.every((part) => wholeInRange(part, PPPOE_RANGES.vlan))) return false;
  return parts.length === 1 || Number(parts[0]) < Number(parts[1]);
}

export function interfaceProblem(
  draft: PPPoEInterfaceDraft,
  vlanMonSupported: boolean,
): SaveIssue<PPPoEInterfaceProblem> | null {
  if (!text(draft.interface)) return issue("interfaceRequired");
  const vlans = list(draft.vlans);
  const bad = vlans.find((vlan) => !isVlanValue(vlan));
  if (bad) return issue("vlanInvalid", { vlan: bad, ...PPPOE_RANGES.vlan });
  if (vlanMonSupported && draft.vlan_mon && vlans.length === 0) return issue("vlanMonWithoutVlan");
  return null;
}

/** Ops for one interface; `current` null creates it. The item is the interface. */
export function interfaceOps(
  current: PPPoEInterface | null,
  draft: PPPoEInterfaceDraft,
  vlanMonSupported: boolean,
): BatchOperation[] {
  const ops: BatchOperation[] = [];
  if (!current) ops.push({ op: "create_interface" });
  multi(ops, "set_interface_vlan", "delete_interface_vlan", current?.vlans, draft.vlans, "delete_interface_all_vlans");
  if (vlanMonSupported) {
    flag(ops, "set_interface_vlan_mon", "delete_interface_vlan_mon", !!current?.vlan_mon, draft.vlan_mon);
  }
  flag(ops, "set_interface_combined", "delete_interface_combined", !!current?.combined, draft.combined);
  return ops;
}

// ============================================================================
// PPP options
// ============================================================================

export interface PPPoEPppOptionsDraft {
  ipv4: string;
  ipv6: string;
  mppe: string;
  disable_ccp: boolean;
  interface_cache: string;
  min_mtu: string;
  mru: string;
  lcp_echo_failure: string;
  lcp_echo_interval: string;
  lcp_echo_timeout: string;
  ipv6_interface_id: string;
  ipv6_peer_interface_id: string;
  /** 1.5 only. Loaded as the mask when stored. */
  ipv6_peer_interface_id_secret: string;
  ipv6_accept_peer_interface_id: boolean;
}

export type PPPoEPppOptionsProblem =
  | "minMtuRange"
  | "mruRange"
  | "interfaceCacheRange"
  | "lcpEchoFailureMin"
  | "lcpEchoIntervalMin"
  | "lcpEchoTimeoutMin"
  | "peerSecretRequired"
  | "peerSecretIsMask"
  | "peerSecretInvalid";

/** 16-128 printable ASCII characters without whitespace (lab constraint). */
function validPeerSecret(value: string): boolean {
  const { min, max } = PPPOE_RANGES.peerInterfaceIdSecret;
  return value.length >= min && value.length <= max && /^[\x21-\x7e]+$/.test(value);
}

export function pppOptionsProblem(
  current: PPPoEPppOptions,
  draft: PPPoEPppOptionsDraft,
  secretSupported: boolean,
): SaveIssue<PPPoEPppOptionsProblem> | null {
  const bounded = rangeIssue("minMtuRange", draft.min_mtu, PPPOE_RANGES.pppMinMtu)
    ?? rangeIssue("mruRange", draft.mru, PPPOE_RANGES.pppMru)
    ?? rangeIssue("interfaceCacheRange", draft.interface_cache, PPPOE_RANGES.interfaceCache)
    ?? minimumIssue("lcpEchoFailureMin", draft.lcp_echo_failure, PPPOE_MINIMUMS.lcpEcho)
    ?? minimumIssue("lcpEchoIntervalMin", draft.lcp_echo_interval, PPPOE_MINIMUMS.lcpEcho)
    ?? minimumIssue("lcpEchoTimeoutMin", draft.lcp_echo_timeout, PPPOE_MINIMUMS.lcpEcho);
  if (bounded) return bounded;
  if (!secretSupported || text(draft.ipv6_peer_interface_id) !== CALLING_SID) return null;
  const stored = current.ipv6_peer_interface_id_secret;
  const value = draft.ipv6_peer_interface_id_secret;
  if (typedMask(stored, value)) return issue("peerSecretIsMask");
  if (stored && value === MASKED_SECRET) return null;
  // Lab verify (1.5): calling-sid needs the secret.
  if (!value) return issue("peerSecretRequired");
  if (!validPeerSecret(value)) return issue("peerSecretInvalid", { ...PPPOE_RANGES.peerInterfaceIdSecret });
  return null;
}

/** Whether any leaf the screen manages is set (the node then exists). */
function pppOptionsSet(o: {
  ipv4?: string | null; ipv6?: string | null; mppe?: string | null; disable_ccp: boolean;
  interface_cache?: string | null; min_mtu?: string | null; mru?: string | null;
  lcp_echo_failure?: string | null; lcp_echo_interval?: string | null; lcp_echo_timeout?: string | null;
  ipv6_interface_id?: string | null; ipv6_peer_interface_id?: string | null;
  ipv6_peer_interface_id_secret?: string | null; ipv6_accept_peer_interface_id: boolean;
}): boolean {
  return o.disable_ccp || o.ipv6_accept_peer_interface_id || [
    o.ipv4, o.ipv6, o.mppe, o.interface_cache, o.min_mtu, o.mru, o.lcp_echo_failure, o.lcp_echo_interval,
    o.lcp_echo_timeout, o.ipv6_interface_id, o.ipv6_peer_interface_id, o.ipv6_peer_interface_id_secret,
  ].some((v) => !!text(v));
}

export function pppOptionsOps(
  current: PPPoEPppOptions,
  draft: PPPoEPppOptionsDraft,
  secretSupported: boolean,
): BatchOperation[] {
  const ops: BatchOperation[] = [];
  const draftSecret = secretSupported && text(draft.ipv6_peer_interface_id) === CALLING_SID
    ? draft.ipv6_peer_interface_id_secret
    : "";
  if (pppOptionsSet(current) && !pppOptionsSet({ ...draft, ipv6_peer_interface_id_secret: draftSecret })) {
    // Everything cleared: drop the node instead of leaving it empty.
    ops.push({ op: "delete_ppp_options" });
    return ops;
  }
  leaf(ops, "set_ppp_ipv4", "delete_ppp_ipv4", current.ipv4, draft.ipv4);
  leaf(ops, "set_ppp_ipv6", "delete_ppp_ipv6", current.ipv6, draft.ipv6);
  leaf(ops, "set_ppp_mppe", "delete_ppp_mppe", current.mppe, draft.mppe);
  flag(ops, "set_ppp_disable_ccp", "delete_ppp_disable_ccp", current.disable_ccp, draft.disable_ccp);
  leaf(ops, "set_ppp_interface_cache", "delete_ppp_interface_cache", current.interface_cache, draft.interface_cache);
  leaf(ops, "set_ppp_min_mtu", "delete_ppp_min_mtu", current.min_mtu, draft.min_mtu);
  leaf(ops, "set_ppp_mru", "delete_ppp_mru", current.mru, draft.mru);
  leaf(ops, "set_ppp_lcp_echo_failure", "delete_ppp_lcp_echo_failure", current.lcp_echo_failure, draft.lcp_echo_failure);
  leaf(ops, "set_ppp_lcp_echo_interval", "delete_ppp_lcp_echo_interval",
    current.lcp_echo_interval, draft.lcp_echo_interval);
  leaf(ops, "set_ppp_lcp_echo_timeout", "delete_ppp_lcp_echo_timeout", current.lcp_echo_timeout, draft.lcp_echo_timeout);
  leaf(ops, "set_ppp_ipv6_interface_id", "delete_ppp_ipv6_interface_id",
    current.ipv6_interface_id, draft.ipv6_interface_id);
  leaf(ops, "set_ppp_ipv6_peer_interface_id", "delete_ppp_ipv6_peer_interface_id",
    current.ipv6_peer_interface_id, draft.ipv6_peer_interface_id);
  if (secretSupported) {
    // The secret only serves calling-sid: leaving it deletes the stored one.
    optionalSecret(ops, "set_ppp_ipv6_peer_interface_id_secret", "delete_ppp_ipv6_peer_interface_id_secret",
      current.ipv6_peer_interface_id_secret, draftSecret);
  }
  flag(ops, "set_ppp_ipv6_accept_peer_interface_id", "delete_ppp_ipv6_accept_peer_interface_id",
    current.ipv6_accept_peer_interface_id, draft.ipv6_accept_peer_interface_id);
  return ops;
}

// ============================================================================
// Advanced settings (log, PADO delays, limits, shaper, snmp, extended-scripts)
// ============================================================================

export interface PPPoEPadoDelayRow {
  delay: string;
  sessions: string;
}

export interface PPPoEAdvancedDraft {
  log_level: string;
  pado_delays: PPPoEPadoDelayRow[];
  limits_enabled: boolean;
  limits_burst: string;
  limits_connection_limit: string;
  limits_timeout: string;
  shaper_enabled: boolean;
  shaper_fwmark: string;
  snmp_enabled: boolean;
  snmp_master_agent: boolean;
  scripts_enabled: boolean;
  scripts_on_change: string;
  scripts_on_down: string;
  scripts_on_pre_up: string;
  scripts_on_up: string;
}

export type PPPoEAdvancedProblem =
  | "padoDelayRequired"
  | "padoDelayInvalid"
  | "padoSessionsRange"
  | "duplicatePadoDelay"
  | "padoDisableNeedsSessions"
  | "padoOneWithoutSessions"
  | "padoAfterDisable"
  | "connectionLimitFormat"
  | "fwmarkRange";

function validPadoDelay(delay: string): boolean {
  return delay === PADO_DISABLE || wholeInRange(delay, PPPOE_RANGES.padoDelay);
}

export function advancedProblem(draft: PPPoEAdvancedDraft): SaveIssue<PPPoEAdvancedProblem> | null {
  const rows = draft.pado_delays.filter((row) => filled(row.delay, row.sessions));
  if (rows.some((row) => !text(row.delay))) return issue("padoDelayRequired");
  for (const row of rows) {
    const delay = text(row.delay);
    if (!validPadoDelay(delay)) return issue("padoDelayInvalid", { delay, ...PPPOE_RANGES.padoDelay });
    const bad = rangeIssue("padoSessionsRange", row.sessions, PPPOE_RANGES.padoSessions, { delay });
    if (bad) return bad;
  }
  const duplicate = firstDuplicate(rows.map((row) => text(row.delay)));
  if (duplicate) return issue("duplicatePadoDelay", { delay: duplicate });
  // Lab verify (verify_pado_delay).
  const withoutSessions = rows.filter((row) => !text(row.sessions)).map((row) => text(row.delay));
  if (withoutSessions.includes(PADO_DISABLE)) return issue("padoDisableNeedsSessions");
  if (withoutSessions.length > 1) return issue("padoOneWithoutSessions");
  const disable = rows.find((row) => text(row.delay) === PADO_DISABLE);
  if (disable) {
    const limit = Number(text(disable.sessions));
    const after = rows.find((row) => text(row.sessions) && Number(text(row.sessions)) > limit);
    if (after) return issue("padoAfterDisable", { delay: text(after.delay) });
  }
  // Burst and timeout have no lab validator; the connection limit is a rate.
  const connectionLimit = text(draft.limits_connection_limit);
  if (draft.limits_enabled && connectionLimit && !CONNECTION_LIMIT_PATTERN.test(connectionLimit)) {
    return issue("connectionLimitFormat", { value: connectionLimit });
  }
  if (draft.shaper_enabled) {
    const fwmark = rangeIssue("fwmarkRange", draft.shaper_fwmark, PPPOE_RANGES.shaperFwmark);
    if (fwmark) return fwmark;
  }
  return null;
}

export function advancedOps(current: PPPoEConfigResponse, draft: PPPoEAdvancedDraft): BatchOperation[] {
  const ops: BatchOperation[] = [];
  leaf(ops, "set_log_level", "delete_log_level", current.log.level, draft.log_level);

  // PADO delays are keyed by the trimmed delay; the value names the delay.
  const delaysBefore = new Map(current.pado_delays.map((d) => [text(d.delay), text(d.sessions)]));
  const delaysAfter = new Map(
    draft.pado_delays.filter((row) => text(row.delay)).map((row) => [text(row.delay), text(row.sessions)]),
  );
  if (delaysBefore.size > 0 && delaysAfter.size === 0) {
    ops.push({ op: "delete_all_pado_delays" });
  } else {
    for (const delay of delaysBefore.keys()) {
      if (!delaysAfter.has(delay)) ops.push({ op: "delete_pado_delay", value: delay });
    }
  }
  for (const [delay, sessions] of delaysAfter) {
    const before = delaysBefore.get(delay);
    if (before === sessions) continue;
    if (sessions) ops.push({ op: "set_pado_delay_sessions", value: `${delay}|${sessions}` });
    else if (before === undefined) ops.push({ op: "set_pado_delay", value: delay });
    else ops.push({ op: "delete_pado_delay_sessions", value: delay });
  }

  const limits = current.limits;
  section(ops, "set_limits", "delete_limits", limits.enabled, draft.limits_enabled, () => {
    const children: BatchOperation[] = [];
    leaf(children, "set_limits_burst", "delete_limits_burst", limits.burst, draft.limits_burst);
    leaf(children, "set_limits_connection_limit", "delete_limits_connection_limit",
      limits.connection_limit, draft.limits_connection_limit);
    leaf(children, "set_limits_timeout", "delete_limits_timeout", limits.timeout, draft.limits_timeout);
    return children;
  });

  const shaper = current.shaper;
  section(ops, "set_shaper", "delete_shaper", shaper.enabled, draft.shaper_enabled, () => {
    const children: BatchOperation[] = [];
    leaf(children, "set_shaper_fwmark", "delete_shaper_fwmark", shaper.fwmark, draft.shaper_fwmark);
    return children;
  });

  const snmp = current.snmp;
  section(ops, "set_snmp", "delete_snmp", snmp.enabled, draft.snmp_enabled, () => {
    const children: BatchOperation[] = [];
    flag(children, "set_snmp_master_agent", "delete_snmp_master_agent", snmp.master_agent, draft.snmp_master_agent);
    return children;
  });

  const scripts = current.extended_scripts;
  // A bare extended-scripts node still loads pppd_compat, so it is a section.
  section(ops, "set_extended_scripts", "delete_extended_scripts", scripts.enabled, draft.scripts_enabled, () => {
    const children: BatchOperation[] = [];
    leaf(children, "set_script_on_change", "delete_script_on_change", scripts.on_change, draft.scripts_on_change);
    leaf(children, "set_script_on_down", "delete_script_on_down", scripts.on_down, draft.scripts_on_down);
    leaf(children, "set_script_on_pre_up", "delete_script_on_pre_up", scripts.on_pre_up, draft.scripts_on_pre_up);
    leaf(children, "set_script_on_up", "delete_script_on_up", scripts.on_up, draft.scripts_on_up);
    return children;
  });
  return ops;
}
