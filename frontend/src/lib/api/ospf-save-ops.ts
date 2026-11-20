import type {
  OspfAccessList,
  OspfArea,
  OspfAreaRange,
  OspfAuthentication,
  OspfBatchOperation,
  OspfConfig,
  OspfDefaultInformation,
  OspfDistance,
  OspfGracefulRestart,
  OspfInterface,
  OspfMaxMetricRouterLsa,
  OspfMplsTe,
  OspfNeighbor,
  OspfRedistribute,
  OspfSegmentRouting,
  OspfSegmentRoutingPrefix,
  OspfSummaryAddress,
  OspfTimersThrottleSpf,
  OspfVirtualLink,
} from "./ospf";

/** Secrets load from GET /config as this mask. It is never sent back. */
export const MASKED_SECRET = "***";

type Op = OspfBatchOperation;
type Scalar = string | number | null | undefined;

// ============================================================================
// Normalizers. The save checks and the emit read values through these.
// ============================================================================

export function ospfText(value: Scalar): string {
  return value == null ? "" : String(value).trim();
}

function ospfNum(value: Scalar): string | null {
  const text = ospfText(value);
  return text === "" ? null : text;
}

function withTarget(target: string | undefined, value?: string): string | undefined {
  if (target === undefined) return value;
  return value === undefined ? target : `${target},${value}`;
}

/** Set a single-value leaf when it changed, delete it when it was cleared. */
function leaf(
  ops: Op[],
  setOp: string,
  deleteOp: string,
  target: string | undefined,
  before: Scalar,
  after: Scalar,
): void {
  const b = ospfNum(before);
  const a = ospfNum(after);
  if (a === b) return;
  if (a === null) {
    ops.push(target === undefined ? { op: deleteOp } : { op: deleteOp, value: target });
  } else {
    ops.push({ op: setOp, value: withTarget(target, a) });
  }
}

/** Set or delete a valueless leaf when the flag changed. */
function flag(
  ops: Op[],
  setOp: string,
  deleteOp: string,
  target: string | undefined,
  before: boolean | null | undefined,
  after: boolean | null | undefined,
): void {
  if (!!before === !!after) return;
  const op = after ? setOp : deleteOp;
  ops.push(target === undefined ? { op } : { op, value: target });
}

function keyed<T>(items: T[], key: (item: T) => string): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) map.set(ospfText(key(item)), item);
  return map;
}

/** Problem key for a keyed list: a blank name or a name used twice. */
function listProblem<T, K extends string>(items: T[], key: (item: T) => Scalar, blank: K, duplicate: K): K | null {
  const seen = new Set<string>();
  for (const item of items) {
    const name = ospfText(key(item));
    if (!name) return blank;
    if (seen.has(name)) return duplicate;
    seen.add(name);
  }
  return null;
}

// ============================================================================
// Authentication (interface and virtual link)
// ============================================================================

export type OspfAuthMode = "" | "plaintext-password" | "md5" | "null";

export interface OspfAuthDraft {
  mode: OspfAuthMode;
  keys: { id: string; value: string }[];
  password: string;
}

export const EMPTY_AUTH: OspfAuthentication = { md5_key_ids: {}, plaintext_password: null, null: false };

export function ospfAuthMode(auth: OspfAuthentication | null | undefined): OspfAuthMode {
  if (!auth) return "";
  if (Object.keys(auth.md5_key_ids || {}).length > 0) return "md5";
  if (ospfText(auth.plaintext_password)) return "plaintext-password";
  if (auth.null) return "null";
  return "";
}

/** Form state for a loaded node. Loaded secrets stay as the mask. */
export function ospfAuthDraft(auth: OspfAuthentication | null | undefined): OspfAuthDraft {
  return {
    mode: ospfAuthMode(auth),
    keys: Object.entries(auth?.md5_key_ids || {}).map(([id, value]) => ({ id, value })),
    password: ospfText(auth?.plaintext_password),
  };
}

function draftRows(draft: OspfAuthDraft): { id: string; value: string }[] {
  return draft.keys
    .map((row) => ({ id: ospfText(row.id), value: ospfText(row.value) }))
    .filter((row) => row.id !== "" || row.value !== "");
}

/** The payload for the selected mode only. A blank row the user never filled is dropped. */
export function ospfAuthFromDraft(draft: OspfAuthDraft): OspfAuthentication {
  if (draft.mode === "md5") {
    const md5: Record<string, string> = {};
    for (const row of draftRows(draft)) md5[row.id] = row.value;
    return { md5_key_ids: md5, plaintext_password: null, null: false };
  }
  if (draft.mode === "plaintext-password") {
    return { md5_key_ids: {}, plaintext_password: ospfText(draft.password), null: false };
  }
  if (draft.mode === "null") return { md5_key_ids: {}, plaintext_password: null, null: true };
  return { ...EMPTY_AUTH };
}

export type OspfAuthProblem =
  | "md5KeyRequired"
  | "md5KeyIdRequired"
  | "md5KeyIdRange"
  | "md5KeyIdDuplicate"
  | "md5KeyValueRequired"
  | "md5KeyInvalid"
  | "plaintextPasswordRequired"
  | "plaintextPasswordInvalid";

/** Error key under ``auth`` for a draft the lab would reject, or null. */
export function ospfAuthProblem(
  original: OspfAuthentication | null | undefined,
  draft: OspfAuthDraft,
): OspfAuthProblem | null {
  const before = ospfAuthMode(original);
  if (draft.mode === "md5") {
    const rows = draftRows(draft);
    if (rows.length === 0) return "md5KeyRequired";
    const seen = new Set<string>();
    for (const row of rows) {
      if (!row.id) return "md5KeyIdRequired";
      const id = Number(row.id);
      if (!/^\d+$/.test(row.id) || id < 1 || id > 255) return "md5KeyIdRange";
      if (seen.has(row.id)) return "md5KeyIdDuplicate";
      seen.add(row.id);
      if (!row.value) return "md5KeyValueRequired";
      if (row.value === MASKED_SECRET) {
        const stored = before === "md5" ? original?.md5_key_ids?.[row.id] : undefined;
        if (stored !== MASKED_SECRET) return "md5KeyValueRequired";
      } else if (/\s/.test(row.value) || row.value.length > 16) {
        return "md5KeyInvalid";
      }
    }
  }
  if (draft.mode === "plaintext-password") {
    const password = ospfText(draft.password);
    if (!password) return "plaintextPasswordRequired";
    if (password === MASKED_SECRET) {
      if (before !== "plaintext-password") return "plaintextPasswordRequired";
    } else if (/\s/.test(password) || password.length > 8) {
      return "plaintextPasswordInvalid";
    }
  }
  return null;
}

/**
 * Authentication ops for one interface (target ``eth0``) or virtual link
 * (target ``area,address``). A masked secret is neither set nor deleted while
 * the mode stays; leaving a mode deletes that mode's node.
 */
export function ospfAuthOps(
  scope: "interface" | "area_virtual_link",
  target: string,
  original: OspfAuthentication | null | undefined,
  updated: OspfAuthentication,
): Op[] {
  const ops: Op[] = [];
  const p = scope;
  const before = ospfAuthMode(original);
  const after = ospfAuthMode(updated);
  const beforeKeys = keyed(Object.entries(original?.md5_key_ids || {}), ([id]) => id);
  const afterKeys = keyed(Object.entries(updated.md5_key_ids || {}), ([id]) => id);
  const setKey = (id: string, value: string) => {
    if (scope === "interface") {
      ops.push({ op: "set_interface_authentication_md5_key_id", value: `${target},${id}` });
    }
    ops.push({ op: `set_${p}_authentication_md5_key_id_md5_key`, value: `${target},${id},${value}` });
  };

  if (after === "") {
    if (before !== "") ops.push({ op: `delete_${p}_authentication`, value: target });
    return ops;
  }
  if (before !== after) {
    if (before === "md5") ops.push({ op: `delete_${p}_authentication_md5`, value: target });
    if (before === "plaintext-password") {
      ops.push({ op: `delete_${p}_authentication_plaintext_password`, value: target });
    }
    if (before === "null") ops.push({ op: `delete_${p}_authentication_null`, value: target });
  }
  if (after === "md5") {
    if (before === "md5") {
      for (const id of beforeKeys.keys()) {
        if (!afterKeys.has(id)) {
          ops.push({ op: `delete_${p}_authentication_md5_key_id`, value: `${target},${id}` });
        }
      }
    }
    for (const [id, [, raw]] of afterKeys) {
      const value = ospfText(raw);
      if (value === MASKED_SECRET && before === "md5" && beforeKeys.has(id)) continue;
      setKey(id, value);
    }
  }
  if (after === "plaintext-password") {
    const password = ospfText(updated.plaintext_password);
    const unchanged = before === after && (password === MASKED_SECRET || password === ospfText(original?.plaintext_password));
    if (!unchanged) ops.push({ op: `set_${p}_authentication_plaintext_password`, value: `${target},${password}` });
  }
  if (after === "null" && before !== "null") {
    ops.push({ op: `set_${p}_authentication_null`, value: target });
  }
  return ops;
}

// ============================================================================
// Interfaces
// ============================================================================

export type OspfPassiveMode = "" | "passive" | "disable";

export function ospfPassiveMode(iface: Pick<OspfInterface, "passive" | "passive_disable"> | null | undefined): OspfPassiveMode {
  if (!iface) return "";
  if (iface.passive_disable) return "disable";
  if (iface.passive) return "passive";
  return "";
}

const INTERFACE_LEAVES: [keyof OspfInterface, string][] = [
  ["area", "area"],
  ["cost", "cost"],
  ["priority", "priority"],
  ["hello_interval", "hello_interval"],
  ["dead_interval", "dead_interval"],
  ["hello_multiplier", "hello_multiplier"],
  ["retransmit_interval", "retransmit_interval"],
  ["transmit_delay", "transmit_delay"],
  ["network", "network"],
  ["bandwidth", "bandwidth"],
];

/** Error key under ``interfaceModal`` for an interface the lab would reject. */
export function ospfInterfaceProblem(updated: OspfInterface): "helloMultiplierDeadInterval" | null {
  if (ospfNum(updated.hello_multiplier) !== null && ospfNum(updated.dead_interval) !== null) {
    return "helloMultiplierDeadInterval";
  }
  return null;
}

export function ospfInterfaceOps(
  original: OspfInterface | null,
  updated: OspfInterface,
  opts: { retransmitWindow: boolean },
): Op[] {
  const ops: Op[] = [];
  const name = ospfText(original?.name ?? updated.name);
  if (!original) ops.push({ op: "set_interface", value: name });

  for (const [field, op] of INTERFACE_LEAVES) {
    leaf(ops, `set_interface_${op}`, `delete_interface_${op}`, name,
      original?.[field] as Scalar, updated[field] as Scalar);
  }
  if (opts.retransmitWindow) {
    leaf(ops, "set_interface_retransmit_window", "delete_interface_retransmit_window", name,
      original?.retransmit_window, updated.retransmit_window);
  }

  const passiveBefore = ospfPassiveMode(original);
  const passiveAfter = ospfPassiveMode(updated);
  if (passiveBefore !== passiveAfter) {
    if (passiveAfter === "") ops.push({ op: "delete_interface_passive", value: name });
    else if (passiveAfter === "disable") ops.push({ op: "set_interface_passive_disable", value: name });
    else if (passiveBefore === "disable") ops.push({ op: "delete_interface_passive_disable", value: name });
    else ops.push({ op: "set_interface_passive", value: name });
  }

  if (!updated.bfd) {
    if (original?.bfd) ops.push({ op: "delete_interface_bfd", value: name });
  } else {
    if (!original?.bfd) ops.push({ op: "set_interface_bfd", value: name });
    leaf(ops, "set_interface_bfd_profile", "delete_interface_bfd_profile", name,
      original?.bfd ? original.bfd_profile : null, updated.bfd_profile);
  }
  flag(ops, "set_interface_mtu_ignore", "delete_interface_mtu_ignore", name, original?.mtu_ignore, updated.mtu_ignore);

  if (!updated.ldp_sync) {
    if (original?.ldp_sync) ops.push({ op: "delete_interface_ldp_sync", value: name });
  } else {
    if (!original?.ldp_sync) ops.push({ op: "set_interface_ldp_sync", value: name });
    const kept = original?.ldp_sync ? original : null;
    flag(ops, "set_interface_ldp_sync_disable", "delete_interface_ldp_sync_disable", name,
      kept?.ldp_sync_disable, updated.ldp_sync_disable);
    leaf(ops, "set_interface_ldp_sync_holddown", "delete_interface_ldp_sync_holddown", name,
      kept?.ldp_sync_holddown, updated.ldp_sync_holddown);
  }

  ops.push(...ospfAuthOps("interface", name, original?.authentication, updated.authentication));
  return ops;
}

// ============================================================================
// Areas, ranges, and virtual links
// ============================================================================

/** Error key under ``areaModal`` for a draft the lab would reject. */
export type OspfAreaProblem =
  | "networkExists"
  | "rangePrefixRequired"
  | "rangeDuplicate"
  | "virtualLinkAddressRequired"
  | "virtualLinkDuplicate";

export function ospfAreaProblem(updated: OspfArea): OspfAreaProblem | null {
  const nets = new Set<string>();
  for (const net of updated.networks) {
    const text = ospfText(net);
    if (nets.has(text)) return "networkExists";
    nets.add(text);
  }
  return (
    listProblem<OspfAreaRange, OspfAreaProblem>(updated.ranges, (r) => r.prefix, "rangePrefixRequired", "rangeDuplicate") ??
    listProblem<OspfVirtualLink, OspfAreaProblem>(
      updated.virtual_links, (v) => v.address, "virtualLinkAddressRequired", "virtualLinkDuplicate",
    )
  );
}

function rangeOps(ops: Op[], id: string, original: OspfAreaRange | null, updated: OspfAreaRange): void {
  const target = `${id},${ospfText(updated.prefix)}`;
  if (!original) ops.push({ op: "set_area_range", value: target });
  leaf(ops, "set_area_range_cost", "delete_area_range_cost", target, original?.cost, updated.cost);
  flag(ops, "set_area_range_not_advertise", "delete_area_range_not_advertise", target,
    original?.not_advertise, updated.not_advertise);
  leaf(ops, "set_area_range_substitute", "delete_area_range_substitute", target, original?.substitute, updated.substitute);
}

const VIRTUAL_LINK_LEAVES: (keyof OspfVirtualLink)[] = [
  "dead_interval", "hello_interval", "retransmit_interval", "transmit_delay",
];

function virtualLinkOps(
  ops: Op[],
  id: string,
  original: OspfVirtualLink | null,
  updated: OspfVirtualLink,
  opts: { retransmitWindow: boolean },
): void {
  const target = `${id},${ospfText(updated.address)}`;
  if (!original) ops.push({ op: "set_area_virtual_link", value: target });
  for (const field of VIRTUAL_LINK_LEAVES) {
    leaf(ops, `set_area_virtual_link_${field}`, `delete_area_virtual_link_${field}`, target,
      original?.[field] as Scalar, updated[field] as Scalar);
  }
  if (opts.retransmitWindow) {
    leaf(ops, "set_area_virtual_link_retransmit_window", "delete_area_virtual_link_retransmit_window", target,
      original?.retransmit_window, updated.retransmit_window);
  }
  ops.push(...ospfAuthOps("area_virtual_link", target, original?.authentication, updated.authentication));
}

export function ospfAreaOps(original: OspfArea | null, updated: OspfArea, opts: { retransmitWindow: boolean }): Op[] {
  const ops: Op[] = [];
  const id = ospfText(original?.area_id ?? updated.area_id);
  if (!original) ops.push({ op: "set_area", value: id });

  const typeBefore = ospfText(original?.area_type);
  const typeAfter = ospfText(updated.area_type);
  const subTyped = typeAfter === "stub" || typeAfter === "nssa";
  const kept = typeBefore === typeAfter ? original : null;
  if (typeBefore !== typeAfter) {
    if (typeBefore) ops.push({ op: "delete_area_type", value: id });
    if (typeAfter) ops.push({ op: `set_area_type_${typeAfter}`, value: id });
  }
  if (subTyped) {
    flag(ops, `set_area_type_${typeAfter}_no_summary`, `delete_area_type_${typeAfter}_no_summary`, id,
      kept?.area_type_no_summary, updated.area_type_no_summary);
    leaf(ops, `set_area_type_${typeAfter}_default_cost`, `delete_area_type_${typeAfter}_default_cost`, id,
      kept?.area_type_default_cost, updated.area_type_default_cost);
  }
  if (typeAfter === "nssa") {
    leaf(ops, "set_area_type_nssa_translate", "delete_area_type_nssa_translate", id,
      kept?.area_type_translate, updated.area_type_translate);
  }

  const netsBefore = new Set((original?.networks || []).map(ospfText));
  const netsAfter = new Set(updated.networks.map(ospfText));
  for (const net of netsBefore) if (!netsAfter.has(net)) ops.push({ op: "delete_area_network", value: `${id},${net}` });
  for (const net of netsAfter) if (!netsBefore.has(net)) ops.push({ op: "set_area_network", value: `${id},${net}` });

  const rangesBefore = keyed(original?.ranges || [], (r) => r.prefix);
  const rangesAfter = keyed(updated.ranges, (r) => r.prefix);
  for (const prefix of rangesBefore.keys()) {
    if (!rangesAfter.has(prefix)) ops.push({ op: "delete_area_range", value: `${id},${prefix}` });
  }
  for (const [prefix, range] of rangesAfter) rangeOps(ops, id, rangesBefore.get(prefix) ?? null, range);

  leaf(ops, "set_area_authentication", "delete_area_authentication", id, original?.authentication, updated.authentication);
  leaf(ops, "set_area_shortcut", "delete_area_shortcut", id, original?.shortcut, updated.shortcut);
  leaf(ops, "set_area_export_list", "delete_area_export_list", id, original?.export_list, updated.export_list);
  leaf(ops, "set_area_import_list", "delete_area_import_list", id, original?.import_list, updated.import_list);

  const linksBefore = keyed(original?.virtual_links || [], (v) => v.address);
  const linksAfter = keyed(updated.virtual_links, (v) => v.address);
  for (const address of linksBefore.keys()) {
    if (!linksAfter.has(address)) ops.push({ op: "delete_area_virtual_link", value: `${id},${address}` });
  }
  for (const [address, link] of linksAfter) virtualLinkOps(ops, id, linksBefore.get(address) ?? null, link, opts);
  return ops;
}

// ============================================================================
// Redistribute
// ============================================================================

export function ospfRedistributeOps(original: OspfRedistribute | null, updated: OspfRedistribute): Op[] {
  const ops: Op[] = [];
  const table = updated.protocol === "table";
  const target = table ? ospfText(updated.table) : updated.protocol;
  const p = table ? "redistribute_table" : "redistribute";
  if (!original) ops.push({ op: `set_${p}`, value: target });
  leaf(ops, `set_${p}_metric`, `delete_${p}_metric`, target, original?.metric, updated.metric);
  leaf(ops, `set_${p}_metric_type`, `delete_${p}_metric_type`, target, original?.metric_type, updated.metric_type);
  leaf(ops, `set_${p}_route_map`, `delete_${p}_route_map`, target, original?.route_map, updated.route_map);
  return ops;
}

// ============================================================================
// Global parameters (overview)
// ============================================================================

export interface OspfParametersDraft {
  router_id?: string | null;
  abr_type?: string | null;
  opaque_lsa: boolean;
  rfc1583_compatibility: boolean;
  passive_interface_default: boolean;
  log_adjacency_changes: boolean;
  log_adjacency_changes_detail: boolean;
  maximum_paths?: number | null;
  auto_cost_reference_bandwidth?: number | null;
  default_metric?: number | null;
}

export function ospfParametersOps(original: OspfConfig, updated: OspfParametersDraft): Op[] {
  const ops: Op[] = [];
  leaf(ops, "set_router_id", "delete_router_id", undefined, original.parameters.router_id, updated.router_id);
  leaf(ops, "set_abr_type", "delete_abr_type", undefined, original.parameters.abr_type, updated.abr_type);
  flag(ops, "set_opaque_lsa", "delete_opaque_lsa", undefined, original.parameters.opaque_lsa, updated.opaque_lsa);
  flag(ops, "set_rfc1583_compatibility", "delete_rfc1583_compatibility", undefined,
    original.parameters.rfc1583_compatibility, updated.rfc1583_compatibility);
  flag(ops, "set_passive_interface_default", "delete_passive_interface_default", undefined,
    original.passive_interface_default, updated.passive_interface_default);

  const logBefore = original.log_adjacency_changes === true;
  if (!updated.log_adjacency_changes) {
    if (logBefore) ops.push({ op: "delete_log_adjacency_changes" });
  } else {
    if (!logBefore) ops.push({ op: "set_log_adjacency_changes" });
    flag(ops, "set_log_adjacency_changes_detail", "delete_log_adjacency_changes_detail", undefined,
      logBefore && original.log_adjacency_changes_detail, updated.log_adjacency_changes_detail);
  }

  leaf(ops, "set_maximum_paths", "delete_maximum_paths", undefined, original.maximum_paths, updated.maximum_paths);
  leaf(ops, "set_auto_cost_reference_bandwidth", "delete_auto_cost_reference_bandwidth", undefined,
    original.auto_cost_reference_bandwidth, updated.auto_cost_reference_bandwidth);
  leaf(ops, "set_default_metric", "delete_default_metric", undefined, original.default_metric, updated.default_metric);
  return ops;
}

export function ospfDefaultInformationOps(original: OspfDefaultInformation, updated: OspfDefaultInformation): Op[] {
  const ops: Op[] = [];
  if (!updated.enabled) {
    if (original.enabled) ops.push({ op: "delete_default_information_originate" });
    return ops;
  }
  const kept = original.enabled ? original : null;
  if (!kept) ops.push({ op: "set_default_information_originate" });
  flag(ops, "set_default_information_originate_always", "delete_default_information_originate_always", undefined,
    kept?.always, updated.always);
  leaf(ops, "set_default_information_originate_metric", "delete_default_information_originate_metric", undefined,
    kept?.metric, updated.metric);
  leaf(ops, "set_default_information_originate_metric_type", "delete_default_information_originate_metric_type",
    undefined, kept?.metric_type, updated.metric_type);
  leaf(ops, "set_default_information_originate_route_map", "delete_default_information_originate_route_map",
    undefined, kept?.route_map, updated.route_map);
  return ops;
}

// ============================================================================
// Advanced tab
// ============================================================================

function anyValue(values: Scalar[]): boolean {
  return values.some((v) => ospfNum(v) !== null);
}

export function ospfTimersOps(original: OspfTimersThrottleSpf, updated: OspfTimersThrottleSpf): Op[] {
  const ops: Op[] = [];
  const fields = ["delay", "initial_holdtime", "max_holdtime"] as const;
  if (!anyValue(fields.map((f) => updated[f]))) {
    if (anyValue(fields.map((f) => original[f]))) ops.push({ op: "delete_timers_throttle_spf" });
    return ops;
  }
  for (const f of fields) {
    leaf(ops, `set_timers_throttle_spf_${f}`, `delete_timers_throttle_spf_${f}`, undefined, original[f], updated[f]);
  }
  return ops;
}

export function ospfDistanceOps(original: OspfDistance, updated: OspfDistance): Op[] {
  const ops: Op[] = [];
  leaf(ops, "set_distance_global", "delete_distance_global", undefined, original.global_value, updated.global_value);
  const fields = ["external", "inter_area", "intra_area"] as const;
  if (!anyValue(fields.map((f) => updated.ospf[f]))) {
    if (anyValue(fields.map((f) => original.ospf?.[f]))) ops.push({ op: "delete_distance_ospf" });
    return ops;
  }
  for (const f of fields) {
    leaf(ops, `set_distance_ospf_${f}`, `delete_distance_ospf_${f}`, undefined, original.ospf?.[f], updated.ospf[f]);
  }
  return ops;
}

export function ospfMaxMetricOps(original: OspfMaxMetricRouterLsa, updated: OspfMaxMetricRouterLsa): Op[] {
  const ops: Op[] = [];
  const set = (m: OspfMaxMetricRouterLsa) => !!m.administrative || anyValue([m.on_shutdown, m.on_startup]);
  if (!set(updated)) {
    if (set(original)) ops.push({ op: "delete_max_metric_router_lsa" });
    return ops;
  }
  flag(ops, "set_max_metric_router_lsa_administrative", "delete_max_metric_router_lsa_administrative", undefined,
    original.administrative, updated.administrative);
  leaf(ops, "set_max_metric_router_lsa_on_shutdown", "delete_max_metric_router_lsa_on_shutdown", undefined,
    original.on_shutdown, updated.on_shutdown);
  leaf(ops, "set_max_metric_router_lsa_on_startup", "delete_max_metric_router_lsa_on_startup", undefined,
    original.on_startup, updated.on_startup);
  return ops;
}

export function ospfGracefulRestartOps(original: OspfGracefulRestart, updated: OspfGracefulRestart): Op[] {
  const ops: Op[] = [];
  if (!updated.enabled) {
    if (original.enabled) ops.push({ op: "delete_graceful_restart" });
    return ops;
  }
  const kept = original.enabled ? original : null;
  if (!kept) ops.push({ op: "set_graceful_restart" });
  leaf(ops, "set_graceful_restart_grace_period", "delete_graceful_restart_grace_period", undefined,
    kept?.grace_period, updated.grace_period);

  const h = updated.helper;
  const hb = kept?.helper;
  const helperSet = (x: OspfGracefulRestart["helper"] | undefined) =>
    !!x && (x.enable || x.no_strict_lsa_checking || x.planned_only || ospfNum(x.supported_grace_time) !== null);
  if (!helperSet(h)) {
    if (helperSet(hb)) ops.push({ op: "delete_graceful_restart_helper" });
    return ops;
  }
  if (!h.enable) {
    if (hb?.enable) ops.push({ op: "delete_graceful_restart_helper_enable" });
  } else {
    if (!hb?.enable) ops.push({ op: "set_graceful_restart_helper_enable" });
    const ridsBefore = new Set(hb?.enable ? (hb.router_ids || []).map(ospfText) : []);
    const ridsAfter = new Set((h.router_ids || []).map(ospfText));
    for (const rid of ridsBefore) {
      if (!ridsAfter.has(rid)) ops.push({ op: "delete_graceful_restart_helper_enable_router_id", value: rid });
    }
    for (const rid of ridsAfter) {
      if (!ridsBefore.has(rid)) ops.push({ op: "set_graceful_restart_helper_enable_router_id", value: rid });
    }
  }
  flag(ops, "set_graceful_restart_helper_no_strict_lsa_checking", "delete_graceful_restart_helper_no_strict_lsa_checking",
    undefined, hb?.no_strict_lsa_checking, h.no_strict_lsa_checking);
  flag(ops, "set_graceful_restart_helper_planned_only", "delete_graceful_restart_helper_planned_only", undefined,
    hb?.planned_only, h.planned_only);
  leaf(ops, "set_graceful_restart_helper_supported_grace_time", "delete_graceful_restart_helper_supported_grace_time",
    undefined, hb?.supported_grace_time, h.supported_grace_time);
  return ops;
}

export function ospfMplsTeOps(original: OspfMplsTe, updated: OspfMplsTe): Op[] {
  const ops: Op[] = [];
  const set = (m: OspfMplsTe) => !!m.enable || ospfNum(m.router_address) !== null;
  if (!updated.enable) {
    if (set(original)) ops.push({ op: "delete_mpls_te" });
    return ops;
  }
  flag(ops, "set_mpls_te_enable", "delete_mpls_te_enable", undefined, original.enable, updated.enable);
  leaf(ops, "set_mpls_te_router_address", "delete_mpls_te_router_address", undefined,
    original.router_address, updated.router_address);
  return ops;
}

export interface OspfMiscDraft {
  ldp_sync_holddown?: number | null;
  refresh_timers?: number | null;
  aggregation_timer?: number | null;
  capability_opaque: boolean;
}

export function ospfMiscOps(original: OspfConfig, updated: OspfMiscDraft): Op[] {
  const ops: Op[] = [];
  leaf(ops, "set_ldp_sync_holddown", "delete_ldp_sync_holddown", undefined, original.ldp_sync_holddown, updated.ldp_sync_holddown);
  leaf(ops, "set_refresh_timers", "delete_refresh_timers", undefined, original.refresh_timers, updated.refresh_timers);
  leaf(ops, "set_aggregation_timer", "delete_aggregation_timer", undefined, original.aggregation_timer, updated.aggregation_timer);
  flag(ops, "set_capability_opaque", "delete_capability_opaque", undefined, original.capability_opaque, updated.capability_opaque);
  return ops;
}

// ============================================================================
// Keyed lists on the advanced tab
// ============================================================================

export function ospfAccessListOps(original: OspfAccessList[], updated: OspfAccessList[]): Op[] {
  const ops: Op[] = [];
  const before = keyed(original, (a) => a.acl);
  const after = keyed(updated, (a) => a.acl);
  for (const acl of before.keys()) if (!after.has(acl)) ops.push({ op: "delete_access_list", value: acl });
  for (const [acl, entry] of after) {
    const prev = before.get(acl);
    if (!prev) ops.push({ op: "set_access_list", value: acl });
    const was = new Set(prev?.export || []);
    const now = new Set(entry.export);
    for (const v of was) if (!now.has(v)) ops.push({ op: "delete_access_list_export", value: `${acl},${v}` });
    for (const v of now) if (!was.has(v)) ops.push({ op: "set_access_list_export", value: `${acl},${v}` });
  }
  return ops;
}

export function ospfNeighborOps(original: OspfNeighbor[], updated: OspfNeighbor[]): Op[] {
  const ops: Op[] = [];
  const before = keyed(original, (n) => n.address);
  const after = keyed(updated, (n) => n.address);
  for (const address of before.keys()) if (!after.has(address)) ops.push({ op: "delete_neighbor", value: address });
  for (const [address, n] of after) {
    const prev = before.get(address) ?? null;
    if (!prev) ops.push({ op: "set_neighbor", value: address });
    leaf(ops, "set_neighbor_poll_interval", "delete_neighbor_poll_interval", address, prev?.poll_interval, n.poll_interval);
    leaf(ops, "set_neighbor_priority", "delete_neighbor_priority", address, prev?.priority, n.priority);
  }
  return ops;
}

export function ospfSummaryAddressOps(original: OspfSummaryAddress[], updated: OspfSummaryAddress[]): Op[] {
  const ops: Op[] = [];
  const before = keyed(original, (s) => s.prefix);
  const after = keyed(updated, (s) => s.prefix);
  for (const prefix of before.keys()) if (!after.has(prefix)) ops.push({ op: "delete_summary_address", value: prefix });
  for (const [prefix, s] of after) {
    const prev = before.get(prefix) ?? null;
    if (!prev) ops.push({ op: "set_summary_address", value: prefix });
    leaf(ops, "set_summary_address_tag", "delete_summary_address_tag", prefix, prev?.tag, s.tag);
    flag(ops, "set_summary_address_no_advertise", "delete_summary_address_no_advertise", prefix,
      prev?.no_advertise, s.no_advertise);
  }
  return ops;
}

export type OspfPrefixFlag = "" | "explicit-null" | "no-php-flag";

export function ospfPrefixFlag(p: Pick<OspfSegmentRoutingPrefix, "explicit_null" | "no_php_flag"> | null | undefined): OspfPrefixFlag {
  if (p?.explicit_null) return "explicit-null";
  if (p?.no_php_flag) return "no-php-flag";
  return "";
}

function flagOp(flagName: OspfPrefixFlag, action: "set" | "delete"): string {
  return `${action}_segment_routing_prefix_${flagName === "explicit-null" ? "explicit_null" : "no_php_flag"}`;
}

function srEmpty(sr: OspfSegmentRouting): boolean {
  return !anyValue([
    sr.global_block_low, sr.global_block_high, sr.local_block_low, sr.local_block_high, sr.maximum_label_depth,
  ]) && (sr.prefixes || []).length === 0;
}

/**
 * Segment routing ops in two commits. VyOS cannot remove a prefix SID that
 * still has explicit-null or no-php-flag in the same commit, so ``first``
 * drops those flags and ``second`` holds the rest.
 */
export function ospfSegmentRoutingOps(
  original: OspfSegmentRouting,
  updated: OspfSegmentRouting,
): { first: Op[]; second: Op[] } {
  const first: Op[] = [];
  const second: Op[] = [];
  const before = keyed(original.prefixes || [], (p) => p.prefix);
  const after = keyed(updated.prefixes || [], (p) => p.prefix);
  for (const [prefix, p] of before) {
    const f = ospfPrefixFlag(p);
    if (!after.has(prefix) && f) first.push({ op: flagOp(f, "delete"), value: prefix });
  }
  if (srEmpty(updated)) {
    if (!srEmpty(original)) second.push({ op: "delete_segment_routing" });
    return { first, second };
  }
  for (const block of ["global", "local"] as const) {
    const low = `${block}_block_low` as const;
    const high = `${block}_block_high` as const;
    if (!anyValue([updated[low], updated[high]])) {
      if (anyValue([original[low], original[high]])) second.push({ op: `delete_segment_routing_${block}_block` });
      continue;
    }
    leaf(second, `set_segment_routing_${block}_block_low`, `delete_segment_routing_${block}_block`, undefined,
      original[low], updated[low]);
    leaf(second, `set_segment_routing_${block}_block_high`, `delete_segment_routing_${block}_block`, undefined,
      original[high], updated[high]);
  }
  leaf(second, "set_segment_routing_maximum_label_depth", "delete_segment_routing_maximum_label_depth", undefined,
    original.maximum_label_depth, updated.maximum_label_depth);
  for (const prefix of before.keys()) {
    if (!after.has(prefix)) second.push({ op: "delete_segment_routing_prefix", value: prefix });
  }
  for (const [prefix, p] of after) {
    const prev = before.get(prefix) ?? null;
    const index = ospfText(p.index_value);
    if (!prev || ospfText(prev.index_value) !== index) {
      second.push({ op: "set_segment_routing_prefix", value: `${prefix},${index}` });
    }
    const was = ospfPrefixFlag(prev);
    const now = ospfPrefixFlag(p);
    if (was !== now) {
      if (was) second.push({ op: flagOp(was, "delete"), value: prefix });
      if (now) second.push({ op: flagOp(now, "set"), value: prefix });
    }
  }
  return { first, second };
}

export type OspfAdvancedProblem =
  | "accessListRequired"
  | "accessListDuplicate"
  | "neighborAddressRequired"
  | "neighborDuplicate"
  | "summaryPrefixRequired"
  | "summaryDuplicate"
  | "srPrefixRequired"
  | "srPrefixDuplicate"
  | "summaryTagNoAdvertise"
  | "srIndexRequired"
  | "srBlockPair"
  | "srBlockOrder"
  | "srLocalNeedsGlobal";

/** Error key under ``advanced`` for keyed lists and segment routing the lab would reject. */
export function ospfAdvancedProblem(draft: {
  accessLists: OspfAccessList[];
  neighbors: OspfNeighbor[];
  summaryAddresses: OspfSummaryAddress[];
  segmentRouting: OspfSegmentRouting;
}): OspfAdvancedProblem | null {
  const listError =
    listProblem<OspfAccessList, OspfAdvancedProblem>(draft.accessLists, (a) => a.acl, "accessListRequired", "accessListDuplicate") ??
    listProblem<OspfNeighbor, OspfAdvancedProblem>(draft.neighbors, (n) => n.address, "neighborAddressRequired", "neighborDuplicate") ??
    listProblem<OspfSummaryAddress, OspfAdvancedProblem>(
      draft.summaryAddresses, (s) => s.prefix, "summaryPrefixRequired", "summaryDuplicate",
    ) ??
    listProblem<OspfSegmentRoutingPrefix, OspfAdvancedProblem>(
      draft.segmentRouting.prefixes || [], (p) => p.prefix, "srPrefixRequired", "srPrefixDuplicate",
    );
  if (listError) return listError;
  if (draft.summaryAddresses.some((s) => s.no_advertise && ospfNum(s.tag) !== null)) return "summaryTagNoAdvertise";
  if ((draft.segmentRouting.prefixes || []).some((p) => ospfNum(p.index_value) === null)) return "srIndexRequired";
  const sr = draft.segmentRouting;
  for (const block of ["global", "local"] as const) {
    const low = ospfNum(sr[`${block}_block_low`]);
    const high = ospfNum(sr[`${block}_block_high`]);
    if ((low === null) !== (high === null)) return "srBlockPair";
    if (low !== null && high !== null && Number(low) > Number(high)) return "srBlockOrder";
  }
  if (ospfNum(sr.local_block_low) !== null && ospfNum(sr.global_block_low) === null) return "srLocalNeedsGlobal";
  return null;
}
