import type {
  BatchOperation,
  CachePeer,
  ListenAddress,
  SquidGuard,
  SquidGuardRule,
  SquidGuardSourceGroup,
  SquidGuardTimePeriod,
  WebProxyAuthentication,
  WebProxyConfig,
} from "./webproxy";

/** GET /config returns a configured LDAP bind password as this mask. */
export const MASKED_SECRET = "***";

type Scalar = number | string | null | undefined;

/** Every value the save reads goes through this: trimmed, null and undefined become "". */
export function normalizeValue(value: Scalar): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

/** Trimmed, non-empty, first occurrence kept. */
export function normalizeList(values: readonly string[] | null | undefined): string[] {
  const out: string[] = [];
  for (const value of values ?? []) {
    const v = normalizeValue(value);
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

/** The batch router splits value on "," into the builder arguments after the key. */
function keyed(key: string | undefined, ...rest: string[]): string | undefined {
  const parts = key === undefined ? rest : [key, ...rest];
  return parts.length === 0 ? undefined : parts.join(",");
}

function push(ops: BatchOperation[], op: string, value: string | undefined): void {
  ops.push(value === undefined ? { op } : { op, value });
}

/** A changed single-value leaf is set; a cleared one is deleted. */
function scalarOps(
  ops: BatchOperation[],
  setOp: string,
  deleteOp: string,
  before: Scalar,
  after: Scalar,
  key?: string,
): void {
  const b = normalizeValue(before);
  const a = normalizeValue(after);
  if (a === b) return;
  if (a) push(ops, setOp, keyed(key, a));
  else push(ops, deleteOp, keyed(key));
}

function flagOps(
  ops: BatchOperation[],
  setOp: string,
  deleteOp: string,
  before: boolean | undefined,
  after: boolean | undefined,
  key?: string,
): void {
  if (!!before === !!after) return;
  push(ops, after ? setOp : deleteOp, keyed(key));
}

/** A multi leaf deletes only the removed values; clearing every value deletes the leaf. */
function listOps(
  ops: BatchOperation[],
  addOp: string,
  deleteOp: string,
  deleteAllOp: string,
  before: readonly string[] | undefined,
  after: readonly string[] | undefined,
  key?: string,
): void {
  const b = normalizeList(before);
  const a = normalizeList(after);
  if (a.length === 0) {
    if (b.length > 0) push(ops, deleteAllOp, keyed(key));
    return;
  }
  for (const v of b) if (!a.includes(v)) push(ops, deleteOp, keyed(key, v));
  for (const v of a) if (!b.includes(v)) push(ops, addOp, keyed(key, v));
}

/** Unchanged mask keeps the stored secret, a cleared field deletes it, new text sets it. */
function secretOps(ops: BatchOperation[], setOp: string, deleteOp: string, before: Scalar, after: Scalar): void {
  const a = normalizeValue(after);
  if (a === MASKED_SECRET) return;
  if (!a) {
    if (normalizeValue(before)) push(ops, deleteOp, undefined);
    return;
  }
  if (a !== normalizeValue(before)) push(ops, setOp, a);
}

// ----- Global settings ------------------------------------------------------

const SCALAR_SETTINGS = [
  "append_domain",
  "cache_size",
  "default_port",
  "maximum_object_size",
  "mem_cache_size",
  "minimum_object_size",
  "outgoing_address",
  "reply_body_max_size",
] as const;

const LIST_SETTINGS = [
  ["domain_block", "domain_block"],
  ["domain_noncache", "domain_noncache"],
  ["reply_block_mime", "reply_block_mime"],
  ["safe_ports", "safe_port"],
  ["ssl_safe_ports", "ssl_safe_port"],
] as const;

export function settingsOps(original: WebProxyConfig, updated: WebProxyConfig): BatchOperation[] {
  const ops: BatchOperation[] = [];
  for (const field of SCALAR_SETTINGS) {
    scalarOps(ops, `set_${field}`, `delete_${field}`, original[field], updated[field]);
  }
  flagOps(ops, "set_disable_access_log", "delete_disable_access_log", original.disable_access_log, updated.disable_access_log);
  for (const [field, op] of LIST_SETTINGS) {
    listOps(ops, `add_${op}`, `delete_${op}`, `delete_${op}_all`, original[field], updated[field]);
  }
  return ops;
}

// ----- Authentication -------------------------------------------------------

export function authenticationOps(original: WebProxyAuthentication, updated: WebProxyAuthentication): BatchOperation[] {
  const ops: BatchOperation[] = [];
  scalarOps(ops, "set_authentication_children", "delete_authentication_children", original.children, updated.children);
  scalarOps(ops, "set_authentication_credentials_ttl", "delete_authentication_credentials_ttl", original.credentials_ttl, updated.credentials_ttl);
  scalarOps(ops, "set_authentication_method", "delete_authentication_method", original.method, updated.method);
  scalarOps(ops, "set_authentication_realm", "delete_authentication_realm", original.realm, updated.realm);

  const b = original.ldap;
  const a = updated.ldap;
  scalarOps(ops, "set_ldap_server", "delete_ldap_server", b.server, a.server);
  scalarOps(ops, "set_ldap_base_dn", "delete_ldap_base_dn", b.base_dn, a.base_dn);
  scalarOps(ops, "set_ldap_bind_dn", "delete_ldap_bind_dn", b.bind_dn, a.bind_dn);
  scalarOps(ops, "set_ldap_filter_expression", "delete_ldap_filter_expression", b.filter_expression, a.filter_expression);
  secretOps(ops, "set_ldap_password", "delete_ldap_password", b.password, a.password);
  scalarOps(ops, "set_ldap_username_attribute", "delete_ldap_username_attribute", b.username_attribute, a.username_attribute);
  scalarOps(ops, "set_ldap_port", "delete_ldap_port", b.port, a.port);
  scalarOps(ops, "set_ldap_version", "delete_ldap_version", b.version, a.version);
  flagOps(ops, "set_ldap_persistent_connection", "delete_ldap_persistent_connection", b.persistent_connection, a.persistent_connection);
  flagOps(ops, "set_ldap_use_ssl", "delete_ldap_use_ssl", b.use_ssl, a.use_ssl);
  return ops;
}

// ----- Cache peers ----------------------------------------------------------

export function cachePeerOps(peer: CachePeer, original: CachePeer | null): BatchOperation[] {
  const ops: BatchOperation[] = [];
  const name = normalizeValue(original?.name ?? peer.name);
  const before: Partial<CachePeer> = original ?? {};
  if (!original) push(ops, "set_cache_peer", name);
  scalarOps(ops, "set_cache_peer_address", "delete_cache_peer_address", before.address, peer.address, name);
  scalarOps(ops, "set_cache_peer_http_port", "delete_cache_peer_http_port", before.http_port, peer.http_port, name);
  scalarOps(ops, "set_cache_peer_icp_port", "delete_cache_peer_icp_port", before.icp_port, peer.icp_port, name);
  scalarOps(ops, "set_cache_peer_options", "delete_cache_peer_options", before.options, peer.options, name);
  scalarOps(ops, "set_cache_peer_type", "delete_cache_peer_type", before.type, peer.type, name);
  return ops;
}

// ----- Listen addresses -----------------------------------------------------

export function listenAddressOps(addr: ListenAddress, original: ListenAddress | null): BatchOperation[] {
  const ops: BatchOperation[] = [];
  const address = normalizeValue(original?.address ?? addr.address);
  if (!original) push(ops, "set_listen_address", address);
  scalarOps(ops, "set_listen_address_port", "delete_listen_address_port", original?.port, addr.port, address);
  flagOps(
    ops,
    "set_listen_address_disable_transparent",
    "delete_listen_address_disable_transparent",
    original?.disable_transparent,
    addr.disable_transparent,
    address,
  );
  return ops;
}

// ----- squidGuard -----------------------------------------------------------

const SQUIDGUARD_LISTS = [
  ["allow_categories", "allow_category"],
  ["block_categories", "block_category"],
  ["log", "log"],
  ["local_block", "local_block"],
  ["local_block_keyword", "local_block_keyword"],
  ["local_block_url", "local_block_url"],
  ["local_ok", "local_ok"],
  ["local_ok_url", "local_ok_url"],
] as const;

export function squidGuardGlobalOps(original: SquidGuard, updated: SquidGuard): BatchOperation[] {
  const ops: BatchOperation[] = [];
  for (const [field, op] of SQUIDGUARD_LISTS) {
    listOps(
      ops,
      `add_squidguard_${op}`,
      `delete_squidguard_${op}`,
      `delete_squidguard_${op}_all`,
      original[field],
      updated[field],
    );
  }
  flagOps(ops, "set_squidguard_allow_ipaddr_url", "delete_squidguard_allow_ipaddr_url", original.allow_ipaddr_url, updated.allow_ipaddr_url);
  flagOps(ops, "set_squidguard_enable_safe_search", "delete_squidguard_enable_safe_search", original.enable_safe_search, updated.enable_safe_search);
  scalarOps(ops, "set_squidguard_default_action", "delete_squidguard_default_action", original.default_action, updated.default_action);
  scalarOps(ops, "set_squidguard_redirect_url", "delete_squidguard_redirect_url", original.redirect_url, updated.redirect_url);
  scalarOps(ops, "set_squidguard_auto_update_hour", "delete_squidguard_auto_update", original.auto_update_hour, updated.auto_update_hour);
  return ops;
}

export function ruleOps(rule: SquidGuardRule, original: SquidGuardRule | null): BatchOperation[] {
  const ops: BatchOperation[] = [];
  const n = normalizeValue(original?.number ?? rule.number);
  const before: Partial<SquidGuardRule> = original ?? {};
  if (!original) push(ops, "set_squidguard_rule", n);
  for (const [field, op] of SQUIDGUARD_LISTS) {
    listOps(
      ops,
      `add_squidguard_rule_${op}`,
      `delete_squidguard_rule_${op}`,
      `delete_squidguard_rule_${op}_all`,
      before[field],
      rule[field],
      n,
    );
  }
  flagOps(ops, "set_squidguard_rule_allow_ipaddr_url", "delete_squidguard_rule_allow_ipaddr_url", before.allow_ipaddr_url, rule.allow_ipaddr_url, n);
  flagOps(ops, "set_squidguard_rule_enable_safe_search", "delete_squidguard_rule_enable_safe_search", before.enable_safe_search, rule.enable_safe_search, n);
  scalarOps(ops, "set_squidguard_rule_default_action", "delete_squidguard_rule_default_action", before.default_action, rule.default_action, n);
  scalarOps(ops, "set_squidguard_rule_redirect_url", "delete_squidguard_rule_redirect_url", before.redirect_url, rule.redirect_url, n);
  scalarOps(ops, "set_squidguard_rule_source_group", "delete_squidguard_rule_source_group", before.source_group, rule.source_group, n);
  scalarOps(ops, "set_squidguard_rule_time_period", "delete_squidguard_rule_time_period", before.time_period, rule.time_period, n);
  return ops;
}

const SOURCE_GROUP_LISTS = ["address", "domain", "ldap_ip_search", "ldap_user_search"] as const;

export function sourceGroupOps(group: SquidGuardSourceGroup, original: SquidGuardSourceGroup | null): BatchOperation[] {
  const ops: BatchOperation[] = [];
  const name = normalizeValue(original?.name ?? group.name);
  const before: Partial<SquidGuardSourceGroup> = original ?? {};
  if (!original) push(ops, "set_squidguard_source_group", name);
  for (const field of SOURCE_GROUP_LISTS) {
    listOps(
      ops,
      `add_squidguard_source_group_${field}`,
      `delete_squidguard_source_group_${field}`,
      `delete_squidguard_source_group_${field}_all`,
      before[field],
      group[field],
      name,
    );
  }
  scalarOps(ops, "set_squidguard_source_group_description", "delete_squidguard_source_group_description", before.description, group.description, name);
  scalarOps(ops, "set_squidguard_source_group_user", "delete_squidguard_source_group_user", before.user, group.user, name);
  return ops;
}

function dayMap(period: SquidGuardTimePeriod | null): Map<string, string> {
  const days = new Map<string, string>();
  for (const d of period?.days ?? []) {
    const day = normalizeValue(d.day);
    if (day) days.set(day, normalizeValue(d.time));
  }
  return days;
}

export function timePeriodOps(period: SquidGuardTimePeriod, original: SquidGuardTimePeriod | null): BatchOperation[] {
  const ops: BatchOperation[] = [];
  const name = normalizeValue(original?.name ?? period.name);
  if (!original) push(ops, "set_squidguard_time_period", name);
  scalarOps(
    ops,
    "set_squidguard_time_period_description",
    "delete_squidguard_time_period_description",
    original?.description,
    period.description,
    name,
  );

  const before = dayMap(original);
  const after = dayMap(period);
  for (const day of before.keys()) {
    if (!after.has(day)) push(ops, "delete_squidguard_time_period_day", keyed(name, day));
  }
  for (const [day, time] of after) {
    const had = before.get(day);
    if (time) {
      if (time !== had) push(ops, "set_squidguard_time_period_day_time", keyed(name, day, time));
    } else if (had === undefined) {
      push(ops, "set_squidguard_time_period_day", keyed(name, day));
    } else if (had) {
      push(ops, "delete_squidguard_time_period_day_time", keyed(name, day));
    }
  }
  return ops;
}
