import type {
  BatchOperation,
  IsisDefaultInfoEntry,
  IsisFrrPriorityLimit,
  IsisFrrRemotePrefixList,
  IsisFrrTiebreaker,
  IsisGlobalConfig,
  IsisInterface,
  IsisLspTimerDefaults,
  IsisRedistributeEntry,
  IsisSegmentRouting,
  IsisSpfDelayIetf,
  IsisSrPrefix,
  IsisTrafficEngineering,
} from "./isis";

/** Passwords load from GET /config as this mask. The emit never sends it back. */
export const MASKED_SECRET = "***";

type Op = BatchOperation;
type Scalar = string | number | null | undefined;

// ============================================================================
// Normalizers. The save checks and the emit read every value through these.
// ============================================================================

export function isisText(value: Scalar): string {
  return value == null ? "" : String(value).trim();
}

function isisNum(value: Scalar): string | null {
  const text = isisText(value);
  return text === "" ? null : text;
}

function withTarget(target: string | undefined, value?: string): string | undefined {
  if (target === undefined) return value;
  return value === undefined ? target : `${target},${value}`;
}

function push(ops: Op[], op: string, value?: string): void {
  ops.push(value === undefined ? { op } : { op, value });
}

/** Set a single-value leaf when it changed (a set replaces it), delete it when it was cleared. */
function leaf(ops: Op[], setOp: string, deleteOp: string, target: string | undefined, before: Scalar, after: Scalar): void {
  const b = isisNum(before);
  const a = isisNum(after);
  if (a === b) return;
  if (a === null) push(ops, deleteOp, target);
  else push(ops, setOp, withTarget(target, a));
}

/** Set a valueless leaf when turned on, delete it when turned off. */
function flag(
  ops: Op[],
  setOp: string,
  deleteOp: string,
  target: string | undefined,
  before: boolean | null | undefined,
  after: boolean | null | undefined,
): void {
  if (!!before === !!after) return;
  push(ops, after ? setOp : deleteOp, target);
}

function keyed<T>(items: T[], key: (item: T) => Scalar): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) map.set(isisText(key(item)), item);
  return map;
}

/** Trimmed values with blanks dropped, in order. */
function cleanList(values: Scalar[]): string[] {
  return values.map(isisText).filter((v) => v !== "");
}

/** Multi-value leaf: delete the values that left, set the values that arrived. */
function multi(ops: Op[], setOp: string, deleteOp: string, target: string, before: Scalar[], after: Scalar[]): void {
  const was = new Set(cleanList(before));
  const now = new Set(cleanList(after));
  for (const v of was) if (!now.has(v)) push(ops, deleteOp, `${target},${v}`);
  for (const v of now) if (!was.has(v)) push(ops, setOp, `${target},${v}`);
}

function firstDuplicate(values: Scalar[]): string | null {
  const seen = new Set<string>();
  for (const v of cleanList(values)) {
    if (seen.has(v)) return v;
    seen.add(v);
  }
  return null;
}

// ============================================================================
// Allowed values (lab `allowed:` lists)
// ============================================================================

export const ISIS_LEVELS = ["level-1", "level-1-2", "level-2"] as const;
export const ISIS_CIRCUIT_TYPES = ["level-1", "level-1-2", "level-2-only"] as const;
export const ISIS_METRIC_STYLES = ["narrow", "transition", "wide"] as const;
export const ISIS_TOPOLOGIES = [
  "ipv4-multicast", "ipv4-mgmt", "ipv6-unicast", "ipv6-multicast", "ipv6-mgmt", "ipv6-dstsrc",
] as const;
/** Levels of redistribute, default-information and global fast-reroute entries. */
export const ISIS_SPLIT_LEVELS = ["level-1", "level-2"] as const;

export type IsisFamily = "ipv4" | "ipv6";
export const ISIS_FAMILIES: readonly IsisFamily[] = ["ipv4", "ipv6"];

// ============================================================================
// Ranges (lab val_help). The checks and the inputs' min/max read these.
// ============================================================================

export interface IsisRange {
  min: number;
  max: number;
}

export const ISIS_HELLO_INTERVAL: IsisRange = { min: 1, max: 600 };
export const ISIS_HELLO_MULTIPLIER: IsisRange = { min: 2, max: 100 };
export const ISIS_INTERFACE_METRIC: IsisRange = { min: 0, max: 16777215 };
export const ISIS_PRIORITY: IsisRange = { min: 0, max: 127 };
export const ISIS_PSNP_INTERVAL: IsisRange = { min: 0, max: 127 };
export const ISIS_LDP_SYNC_HOLDDOWN: IsisRange = { min: 0, max: 10000 };
export const ISIS_LSP_GEN_INTERVAL: IsisRange = { min: 1, max: 120 };
export const ISIS_LSP_MTU: IsisRange = { min: 128, max: 4352 };
export const ISIS_MAX_LSP_LIFETIME: IsisRange = { min: 350, max: 65535 };
export const ISIS_SPF_INTERVAL: IsisRange = { min: 1, max: 120 };
export const ISIS_SPF_DELAY: IsisRange = { min: 0, max: 60000 };
export const ISIS_SR_LABEL: IsisRange = { min: 16, max: 1048575 };
export const ISIS_SR_MAX_LABEL_DEPTH: IsisRange = { min: 1, max: 16 };
export const ISIS_SR_PREFIX_INDEX: IsisRange = { min: 0, max: 65535 };
export const ISIS_SR_PREFIX_ABSOLUTE: IsisRange = { min: 16, max: 1048575 };
/** redistribute and default-information metric. */
export const ISIS_ROUTE_METRIC: IsisRange = { min: 0, max: 16777215 };
export const ISIS_REMOTE_LFA_MAX_METRIC: IsisRange = { min: 1, max: 16777215 };
export const ISIS_TIEBREAKER_INDEX: IsisRange = { min: 1, max: 255 };
export const ISIS_SRV6_NODE_MSD: IsisRange = { min: 0, max: 255 };
/** 1.5 verify: ``max-lsp-lifetime >= lsp-refresh-interval + 300``. */
export const ISIS_LSP_LIFETIME_MARGIN = 300;

/** Field a range or block error names; the screen maps it to its label. */
export type IsisLabel =
  | "metric"
  | "helloInterval"
  | "helloMultiplier"
  | "priority"
  | "psnpInterval"
  | "ldpSyncHolddown"
  | "lspMtu"
  | "lspGenInterval"
  | "lspRefreshInterval"
  | "maxLspLifetime"
  | "spfInterval"
  | "initDelay"
  | "shortDelay"
  | "longDelay"
  | "holddown"
  | "timeToLearn"
  | "globalBlock"
  | "localBlock"
  | "maximumLabelDepth"
  | "prefixIndex"
  | "prefixAbsolute"
  | "nodeMsd"
  | "remoteLfaMaxMetric"
  | "tiebreakerIndex"
  | "areaPassword"
  | "domainPassword"
  | "interfaceMd5Password"
  | "interfacePlaintextPassword";

export type IsisProblemKey =
  | "range"
  | "rowRange"
  | "passwordRequired"
  | "passwordMask"
  | "interfaceRequired"
  | "excludeDuplicate"
  | "lfaTiLfaConflict"
  | "remoteLfaNeedsLfa"
  | "netRequired"
  | "netSelector"
  | "generalNeedsInterface"
  | "lastInterface"
  | "lspGenNotBelowRefresh"
  | "lspLifetimeTooShort"
  | "spfDelayAllOrNone"
  | "srBlockPair"
  | "srBlockOrder"
  | "srLocalNeedsGlobal"
  | "srBlockOverlap"
  | "srPrefixRequired"
  | "srPrefixInvalid"
  | "srPrefixDuplicate"
  | "srPrefixValueRequired"
  | "srPrefixIndexTooLarge"
  | "srPrefixFlags"
  | "srv6InterfaceRequired"
  | "teAddressInvalid"
  | "protocolRequired"
  | "levelRequired"
  | "redistributeDuplicate"
  | "redistributeLevelMismatch"
  | "levelRedistributeConflict"
  | "defaultInfoDuplicate"
  | "tiebreakerIndexTaken"
  | "tiebreakerDuplicate"
  | "priorityLimitLevelTaken"
  | "remotePrefixListExists"
  | "remotePrefixListLevelTaken"
  | "prefixListRequired";

/** A save the lab would reject: a message key plus the values it names. */
export interface IsisProblem {
  key: IsisProblemKey;
  label?: IsisLabel;
  name?: string;
  level?: string;
  min?: number;
  max?: number;
}

function rangeProblem(value: Scalar, label: IsisLabel, range: IsisRange, name?: string): IsisProblem | null {
  const text = isisNum(value);
  if (text === null) return null;
  const n = Number(text);
  if (!/^\d+$/.test(text) || n < range.min || n > range.max) {
    return name === undefined
      ? { key: "range", label, min: range.min, max: range.max }
      : { key: "rowRange", label, name, min: range.min, max: range.max };
  }
  return null;
}

function firstProblem(...checks: (() => IsisProblem | null)[]): IsisProblem | null {
  for (const check of checks) {
    const problem = check();
    if (problem) return problem;
  }
  return null;
}

// ============================================================================
// Secrets. Sent exactly as typed; only an empty or all-whitespace field is
// cleared, and the mask (also with stray spaces) is never sent.
// ============================================================================

function isMask(value: string): boolean {
  return value.trim() === MASKED_SECRET;
}

function isCleared(value: string): boolean {
  return value.trim() === "";
}

/** One secret leaf: kept mask → nothing, cleared → delete when stored, new text → set. */
function secret(ops: Op[], setOp: string, deleteOp: string, target: string | undefined, stored: boolean, value: string): void {
  if (isMask(value)) return;
  if (isCleared(value)) {
    if (stored) push(ops, deleteOp, target);
    return;
  }
  push(ops, setOp, withTarget(target, value));
}

/** A mask typed where nothing is stored would be sent as the secret. */
function maskProblem(label: IsisLabel, stored: boolean, value: string): IsisProblem | null {
  return !stored && isMask(value) ? { key: "passwordMask", label } : null;
}

// ============================================================================
// Area / domain password. Verify rejects md5 and plaintext together there,
// so the screen shows one mode.
// ============================================================================

export type IsisPasswordMode = "" | "md5" | "plaintext-password";

export interface IsisPasswordDraft {
  mode: IsisPasswordMode;
  password: string;
}

function storedModes(md5: Scalar, plain: Scalar): Set<IsisPasswordMode> {
  const stored = new Set<IsisPasswordMode>();
  if (isisText(md5)) stored.add("md5");
  if (isisText(plain)) stored.add("plaintext-password");
  return stored;
}

/** Form state for the stored passwords: the mask when set. */
export function isisPasswordDraft(md5: Scalar, plain: Scalar): IsisPasswordDraft {
  if (isisText(md5)) return { mode: "md5", password: MASKED_SECRET };
  if (isisText(plain)) return { mode: "plaintext-password", password: MASKED_SECRET };
  return { mode: "", password: "" };
}

/** Draft after the mode Select changes: the mask for a stored mode, else blank. */
export function isisPasswordForMode(md5: Scalar, plain: Scalar, mode: IsisPasswordMode): IsisPasswordDraft {
  return { mode, password: mode && storedModes(md5, plain).has(mode) ? MASKED_SECRET : "" };
}

/** Modes the mode Select offers: the device's modes plus a stored one it lacks. */
export function isisPasswordModes(modes: readonly string[], md5: Scalar, plain: Scalar): string[] {
  const out = [...modes];
  for (const mode of storedModes(md5, plain)) if (!out.includes(mode)) out.push(mode);
  return out;
}

function passwordSuffix(mode: IsisPasswordMode): string {
  return mode === "md5" ? "md5" : "plaintext";
}

/**
 * ``area-password`` / ``domain-password``: every stored mode other than the
 * target is deleted (read from the original); a kept mask emits nothing; a
 * cleared password deletes that mode; none deletes the whole node.
 */
function passwordOps(
  ops: Op[],
  scope: "area" | "domain",
  md5Before: Scalar,
  plainBefore: Scalar,
  draft: IsisPasswordDraft,
): void {
  const p = `${scope}_password`;
  const stored = storedModes(md5Before, plainBefore);
  if (draft.mode === "") {
    if (stored.size > 0) push(ops, `delete_${p}`);
    return;
  }
  for (const mode of stored) {
    if (mode !== draft.mode) push(ops, `delete_${p}_${passwordSuffix(mode)}`);
  }
  const suffix = passwordSuffix(draft.mode);
  secret(ops, `set_${p}_${suffix}`, `delete_${p}_${suffix}`, undefined, stored.has(draft.mode), draft.password);
}

function passwordProblem(label: IsisLabel, md5Before: Scalar, plainBefore: Scalar, draft: IsisPasswordDraft): IsisProblem | null {
  if (draft.mode === "") return null;
  const stored = storedModes(md5Before, plainBefore).has(draft.mode);
  if (isCleared(draft.password) && !stored) return { key: "passwordRequired", label };
  return maskProblem(label, stored, draft.password);
}

// ============================================================================
// NET (single-value leaf; verify needs it plus one interface in the commit)
// ============================================================================

/** ``required`` while IS-IS is configured, or for the first interface. */
export function isisNetProblem(net: string, required: boolean): IsisProblem | null {
  const text = isisText(net);
  if (text === "") return required ? { key: "netRequired" } : null;
  // verify: the last byte (the NSEL) must be 00.
  if (!/\.00$/.test(text)) return { key: "netSelector" };
  return null;
}

// ============================================================================
// Interfaces
// ============================================================================

export interface IsisFrrLevelForm {
  lfa: boolean;
  exclude: string[];
  tiLfa: boolean;
  nodeProtection: boolean;
  linkFallback: boolean;
  remoteLfa: boolean;
  remoteMaxMetric: string;
  remoteTunnelMplsLdp: boolean;
}

export interface IsisInterfaceForm {
  name: string;
  circuit_type: string;
  metric: string;
  hello_interval: string;
  hello_multiplier: string;
  priority: string;
  psnp_interval: string;
  hello_padding: boolean;
  passive: boolean;
  point_to_point: boolean;
  no_three_way_handshake: boolean;
  bfd: boolean;
  bfd_profile: string;
  ldp_sync_holddown: string;
  ldp_sync_disable: boolean;
  /** md5 and plaintext-password commit together on an interface: two independent fields. */
  password_md5: string;
  password_plaintext: string;
  /** ``fast-reroute ti-lfa`` node; a bare node commits. */
  tiLfa: boolean;
  level1: IsisFrrLevelForm;
  level2: IsisFrrLevelForm;
}

export const ISIS_FRR_LEVELS = [
  { key: "level1", n: 1, level: "level-1" },
  { key: "level2", n: 2, level: "level-2" },
] as const;

function frrLevelForm(iface: IsisInterface | null, n: 1 | 2): IsisFrrLevelForm {
  const l = `level${n}` as const;
  return {
    lfa: !!iface?.lfa[`${l}_enabled`],
    exclude: [...(iface?.lfa[`${l}_exclude_interfaces`] ?? [])],
    tiLfa: !!iface?.ti_lfa[`${l}_enabled`],
    nodeProtection: !!iface?.ti_lfa[`${l}_node_protection`],
    linkFallback: !!iface?.ti_lfa[`${l}_link_fallback`],
    remoteLfa: !!iface?.remote_lfa[`${l}_enabled`],
    remoteMaxMetric: isisText(iface?.remote_lfa[`${l}_max_metric`]),
    remoteTunnelMplsLdp: !!iface?.remote_lfa[`${l}_tunnel_mpls_ldp`],
  };
}

/** Form state for a loaded interface (null for Add). Stored passwords stay as the mask. */
export function isisInterfaceForm(iface: IsisInterface | null): IsisInterfaceForm {
  return {
    name: iface?.name ?? "",
    circuit_type: isisText(iface?.circuit_type),
    metric: isisText(iface?.metric),
    hello_interval: isisText(iface?.hello_interval),
    hello_multiplier: isisText(iface?.hello_multiplier),
    priority: isisText(iface?.priority),
    psnp_interval: isisText(iface?.psnp_interval),
    hello_padding: !!iface?.hello_padding,
    passive: !!iface?.passive,
    point_to_point: !!iface?.point_to_point,
    no_three_way_handshake: !!iface?.no_three_way_handshake,
    bfd: !!iface?.bfd,
    bfd_profile: isisText(iface?.bfd_profile),
    ldp_sync_holddown: isisText(iface?.ldp_sync_holddown),
    ldp_sync_disable: !!iface?.ldp_sync_disable,
    password_md5: isisText(iface?.password_md5) ? MASKED_SECRET : "",
    password_plaintext: isisText(iface?.password_plaintext) ? MASKED_SECRET : "",
    tiLfa: !!(iface?.ti_lfa.enabled || iface?.ti_lfa.level1_enabled || iface?.ti_lfa.level2_enabled),
    level1: frrLevelForm(iface, 1),
    level2: frrLevelForm(iface, 2),
  };
}

const INTERFACE_LEAVES = [
  "circuit_type", "metric", "hello_interval", "hello_multiplier", "priority", "psnp_interval",
] as const;
const INTERFACE_FLAGS = ["hello_padding", "passive", "point_to_point", "no_three_way_handshake"] as const;

/** A TI-LFA level counts only while the ti-lfa node is on; link-fallback only under node-protection. */
function tiLevel(form: IsisInterfaceForm, lvl: IsisFrrLevelForm) {
  const on = form.tiLfa && lvl.tiLfa;
  const np = on && lvl.nodeProtection;
  return { on, np, lf: np && lvl.linkFallback };
}

function frrOps(ops: Op[], name: string, before: IsisInterfaceForm | null, after: IsisInterfaceForm): void {
  // LFA enable and exclude interfaces are independent leaves.
  for (const { key, n } of ISIS_FRR_LEVELS) {
    const b = before?.[key];
    const a = after[key];
    flag(ops, `set_interface_lfa_level${n}`, `delete_interface_lfa_level${n}`, name, b?.lfa, a.lfa);
    multi(ops, `set_interface_lfa_level${n}_exclude`, `delete_interface_lfa_level${n}_exclude`, name,
      b?.exclude ?? [], a.exclude);
  }

  const tiBefore = !!before?.tiLfa;
  if (!after.tiLfa) {
    if (tiBefore) push(ops, "delete_interface_ti_lfa", name);
  } else {
    const levelsBefore = ISIS_FRR_LEVELS.some(({ key }) => before && tiLevel(before, before[key]).on);
    const levelsAfter = ISIS_FRR_LEVELS.some(({ key }) => tiLevel(after, after[key]).on);
    if (!levelsAfter && (!tiBefore || levelsBefore)) push(ops, "set_interface_ti_lfa", name);
    for (const { key, n } of ISIS_FRR_LEVELS) {
      const p = `interface_ti_lfa_level${n}`;
      const b = before && tiBefore ? tiLevel(before, before[key]) : { on: false, np: false, lf: false };
      const a = tiLevel(after, after[key]);
      if (!a.on) {
        if (b.on) push(ops, `delete_${p}`, name);
        continue;
      }
      if (!b.on) push(ops, `set_${p}`, name);
      if (!a.np) {
        if (b.on && b.np) push(ops, `delete_${p}_node_protection`, name);
        continue;
      }
      if (!(b.on && b.np)) push(ops, `set_${p}_node_protection`, name);
      flag(ops, `set_${p}_link_fallback`, `delete_${p}_link_fallback`, name, b.on && b.np && b.lf, a.lf);
    }
  }

  for (const { key, n } of ISIS_FRR_LEVELS) {
    const p = `interface_remote_lfa_level${n}`;
    const b = before?.[key];
    const a = after[key];
    if (!a.remoteLfa) {
      if (b?.remoteLfa) push(ops, `delete_${p}`, name);
      continue;
    }
    const kept = b?.remoteLfa ? b : null;
    if (!kept) push(ops, `set_${p}`, name);
    leaf(ops, `set_${p}_max_metric`, `delete_${p}_max_metric`, name, kept?.remoteMaxMetric, a.remoteMaxMetric);
    flag(ops, `set_${p}_tunnel_mpls_ldp`, `delete_${p}_tunnel_mpls_ldp`, name,
      kept?.remoteTunnelMplsLdp, a.remoteTunnelMplsLdp);
  }
}

/** md5 and plaintext-password are independent; clearing both stored ones deletes the node. */
function interfacePasswordOps(ops: Op[], name: string, original: IsisInterface | null, form: IsisInterfaceForm): void {
  const md5Stored = !!isisText(original?.password_md5);
  const plainStored = !!isisText(original?.password_plaintext);
  if (md5Stored && plainStored && isCleared(form.password_md5) && isCleared(form.password_plaintext)) {
    push(ops, "delete_interface_password", name);
    return;
  }
  secret(ops, "set_interface_password_md5", "delete_interface_password_md5", name, md5Stored, form.password_md5);
  secret(ops, "set_interface_password_plaintext", "delete_interface_password_plaintext", name,
    plainStored, form.password_plaintext);
}

/**
 * Interface ops as a diff of (original, form). Create diffs against null.
 * Never deletes and re-creates the interface, so the masked passwords and
 * every leaf the form does not show stay as stored.
 */
export function isisInterfaceOps(
  original: IsisInterface | null,
  form: IsisInterfaceForm,
  opts: { fastReroute: boolean },
): Op[] {
  const ops: Op[] = [];
  const name = isisText(original?.name ?? form.name);
  const before = original ? isisInterfaceForm(original) : null;
  if (!original) push(ops, "set_interface", name);

  for (const field of INTERFACE_LEAVES) {
    leaf(ops, `set_interface_${field}`, `delete_interface_${field}`, name, before?.[field], form[field]);
  }
  for (const field of INTERFACE_FLAGS) {
    flag(ops, `set_interface_${field}`, `delete_interface_${field}`, name, before?.[field], form[field]);
  }

  if (!form.bfd) {
    if (before?.bfd) push(ops, "delete_interface_bfd", name);
  } else {
    if (!before?.bfd) push(ops, "set_interface_bfd", name);
    leaf(ops, "set_interface_bfd_profile", "delete_interface_bfd_profile", name,
      before?.bfd ? before.bfd_profile : null, form.bfd_profile);
  }

  const ldpBefore = !!before && (isisNum(before.ldp_sync_holddown) !== null || before.ldp_sync_disable);
  const ldpAfter = isisNum(form.ldp_sync_holddown) !== null || form.ldp_sync_disable;
  if (!ldpAfter) {
    if (ldpBefore) push(ops, "delete_interface_ldp_sync", name);
  } else {
    leaf(ops, "set_interface_ldp_sync_holddown", "delete_interface_ldp_sync_holddown", name,
      before?.ldp_sync_holddown, form.ldp_sync_holddown);
    flag(ops, "set_interface_ldp_sync_disable", "delete_interface_ldp_sync_disable", name,
      before?.ldp_sync_disable, form.ldp_sync_disable);
  }

  interfacePasswordOps(ops, name, original, form);
  if (opts.fastReroute) frrOps(ops, name, before, form);
  return ops;
}

/** Add Interface; ``net`` (when IS-IS has none yet) is set in the same batch. */
export function isisCreateInterfaceOps(form: IsisInterfaceForm, opts: { fastReroute: boolean }, net: string | null): Op[] {
  const ops: Op[] = [];
  const text = isisText(net);
  if (text) push(ops, "set_net", text);
  return [...ops, ...isisInterfaceOps(null, form, opts)];
}

export function isisInterfaceProblem(
  original: IsisInterface | null,
  form: IsisInterfaceForm,
  opts: { fastReroute: boolean },
): IsisProblem | null {
  if (!isisText(form.name)) return { key: "interfaceRequired" };
  const problem = firstProblem(
    () => rangeProblem(form.metric, "metric", ISIS_INTERFACE_METRIC),
    () => rangeProblem(form.hello_interval, "helloInterval", ISIS_HELLO_INTERVAL),
    () => rangeProblem(form.hello_multiplier, "helloMultiplier", ISIS_HELLO_MULTIPLIER),
    () => rangeProblem(form.priority, "priority", ISIS_PRIORITY),
    () => rangeProblem(form.psnp_interval, "psnpInterval", ISIS_PSNP_INTERVAL),
    () => rangeProblem(form.ldp_sync_holddown, "ldpSyncHolddown", ISIS_LDP_SYNC_HOLDDOWN),
    () => maskProblem("interfaceMd5Password", !!isisText(original?.password_md5), form.password_md5),
    () => maskProblem("interfacePlaintextPassword", !!isisText(original?.password_plaintext), form.password_plaintext),
  );
  if (problem || !opts.fastReroute) return problem;
  for (const { key, level } of ISIS_FRR_LEVELS) {
    const lvl = form[key];
    const dup = firstDuplicate(lvl.exclude);
    if (dup) return { key: "excludeDuplicate", level, name: dup };
    if (lvl.lfa && tiLevel(form, lvl).on) return { key: "lfaTiLfaConflict", level };
    if (lvl.remoteLfa && !lvl.lfa) return { key: "remoteLfaNeedsLfa", level };
    if (lvl.remoteLfa) {
      const range = rangeProblem(lvl.remoteMaxMetric, "remoteLfaMaxMetric", ISIS_REMOTE_LFA_MAX_METRIC, level);
      if (range) return range;
    }
  }
  return null;
}

export function isisDeleteInterfaceOps(name: string): Op[] {
  return [{ op: "delete_interface", value: isisText(name) }];
}

/** verify needs an interface while IS-IS exists; the page "Delete IS-IS" removes the rest. */
export function isisDeleteInterfaceProblem(interfaceCount: number): IsisProblem | null {
  return interfaceCount <= 1 ? { key: "lastInterface" } : null;
}

/**
 * While IS-IS has no interface (so no NET either) verify rejects every commit
 * that does not add both; only Add Interface may save. Every other save path
 * checks this first.
 */
export function isisSetupProblem(interfaceCount: number): IsisProblem | null {
  return interfaceCount === 0 ? { key: "generalNeedsInterface" } : null;
}

export function isisDeleteIsisOps(): Op[] {
  return [{ op: "delete_isis" }];
}

// ============================================================================
// Global: NET, level, metric-style, topology, flags, area/domain passwords
// ============================================================================

export interface IsisGeneralForm {
  net: string;
  level: string;
  metric_style: string;
  topology: string;
  dynamic_hostname: boolean;
  purge_originator: boolean;
  advertise_passive_only: boolean;
  advertise_high_metrics: boolean;
  set_attached_bit: boolean;
  set_overload_bit: boolean;
  log_adjacency_changes: boolean;
  area_password: IsisPasswordDraft;
  domain_password: IsisPasswordDraft;
}

/** [form field, builder op suffix] of every valueless global flag. */
export const ISIS_GENERAL_FLAGS = [
  ["dynamic_hostname", "dynamic_hostname"],
  ["log_adjacency_changes", "log_adjacency_changes"],
  ["purge_originator", "purge_originator"],
  ["advertise_passive_only", "advertise_passive_only"],
  ["advertise_high_metrics", "advertise_high_metrics"],
  ["set_attached_bit", "attached_bit"],
  ["set_overload_bit", "overload_bit"],
] as const;

export function isisGeneralForm(g: IsisGlobalConfig): IsisGeneralForm {
  return {
    net: isisText(g.net),
    level: isisText(g.level),
    metric_style: isisText(g.metric_style),
    topology: isisText(g.topology),
    dynamic_hostname: g.dynamic_hostname,
    purge_originator: g.purge_originator,
    advertise_passive_only: g.advertise_passive_only,
    advertise_high_metrics: g.advertise_high_metrics,
    set_attached_bit: g.set_attached_bit,
    set_overload_bit: g.set_overload_bit,
    log_adjacency_changes: g.log_adjacency_changes,
    area_password: isisPasswordDraft(g.area_password_md5, g.area_password_plaintext),
    domain_password: isisPasswordDraft(g.domain_password_md5, g.domain_password_plaintext),
  };
}

export function isisGeneralOps(original: IsisGlobalConfig, form: IsisGeneralForm): Op[] {
  const ops: Op[] = [];
  leaf(ops, "set_net", "delete_net", undefined, original.net, form.net);
  leaf(ops, "set_level", "delete_level", undefined, original.level, form.level);
  leaf(ops, "set_metric_style", "delete_metric_style", undefined, original.metric_style, form.metric_style);
  leaf(ops, "set_topology", "delete_topology", undefined, original.topology, form.topology);
  for (const [field, op] of ISIS_GENERAL_FLAGS) {
    flag(ops, `set_${op}`, `delete_${op}`, undefined, original[field], form[field]);
  }
  passwordOps(ops, "area", original.area_password_md5, original.area_password_plaintext, form.area_password);
  passwordOps(ops, "domain", original.domain_password_md5, original.domain_password_plaintext, form.domain_password);
  return ops;
}

/**
 * verify needs a NET and an interface in every commit: with no interface yet
 * the user starts from Add Interface (which also takes the NET), and while
 * IS-IS is configured the NET cannot be cleared.
 */
export function isisGeneralProblem(
  original: IsisGlobalConfig,
  form: IsisGeneralForm,
  opts: { interfaceCount: number; redistribute?: IsisRedistributeEntry[] },
): IsisProblem | null {
  if (opts.interfaceCount === 0) return isisSetupProblem(0);
  // Same verify rule as redistribute: a single global level rejects redistribute at the other level.
  const level = isisText(form.level);
  if (level === "level-1" || level === "level-2") {
    const conflict = (opts.redistribute ?? []).find((e) => {
      const l = isisText(e.level);
      return (l === "level-1" || l === "level-2") && l !== level;
    });
    if (conflict) return { key: "levelRedistributeConflict", name: level, level: isisText(conflict.level) };
  }
  return firstProblem(
    () => isisNetProblem(form.net, true),
    () => passwordProblem("areaPassword", original.area_password_md5, original.area_password_plaintext, form.area_password),
    () => passwordProblem("domainPassword", original.domain_password_md5, original.domain_password_plaintext,
      form.domain_password),
  );
}

// ============================================================================
// Global: LSP/SPF timers and ldp-sync
// ============================================================================

export interface IsisTimersForm {
  lsp_mtu: string;
  lsp_gen_interval: string;
  lsp_refresh_interval: string;
  max_lsp_lifetime: string;
  spf_interval: string;
  /** Bare ``ldp-sync`` node (FRR ``mpls ldp-sync``). */
  ldp_sync: boolean;
  ldp_sync_holddown: string;
}

export function isisTimersForm(g: IsisGlobalConfig): IsisTimersForm {
  return {
    lsp_mtu: isisText(g.lsp_mtu),
    lsp_gen_interval: isisText(g.lsp_gen_interval),
    lsp_refresh_interval: isisText(g.lsp_refresh_interval),
    max_lsp_lifetime: isisText(g.max_lsp_lifetime),
    spf_interval: isisText(g.spf_interval),
    ldp_sync: g.ldp_sync || g.ldp_sync_holddown != null,
    ldp_sync_holddown: isisText(g.ldp_sync_holddown),
  };
}

const TIMER_LEAVES = ["lsp_mtu", "lsp_gen_interval", "lsp_refresh_interval", "max_lsp_lifetime", "spf_interval"] as const;

export function isisTimersOps(original: IsisGlobalConfig, form: IsisTimersForm): Op[] {
  const ops: Op[] = [];
  for (const field of TIMER_LEAVES) {
    leaf(ops, `set_${field}`, `delete_${field}`, undefined, original[field], form[field]);
  }
  const nodeBefore = original.ldp_sync || original.ldp_sync_holddown != null;
  const holdBefore = isisNum(original.ldp_sync_holddown);
  if (!form.ldp_sync) {
    if (nodeBefore) push(ops, "delete_ldp_sync");
    return ops;
  }
  const holdAfter = isisNum(form.ldp_sync_holddown);
  if (holdAfter !== null) {
    // A holddown implies the node.
    if (holdAfter !== holdBefore) push(ops, "set_ldp_sync_holddown", holdAfter);
  } else if (holdBefore !== null) {
    push(ops, "delete_ldp_sync_holddown");
  } else if (!nodeBefore) {
    push(ops, "set_ldp_sync");
  }
  return ops;
}

/**
 * ``lspRefresh`` is the capability range (1.4: 1-65235, 1.5: 2-65235).
 * ``caps.lsp_timer_checks`` (1.5 only) turns on verify's cross-checks, which
 * fill an unset timer with ``caps.lsp_timer_defaults``. No caps: no checks.
 */
export function isisTimersProblem(
  form: IsisTimersForm,
  lspRefresh: IsisRange,
  caps: { lsp_timer_checks: boolean; lsp_timer_defaults: IsisLspTimerDefaults } | null,
): IsisProblem | null {
  const problem = firstProblem(
    () => rangeProblem(form.lsp_mtu, "lspMtu", ISIS_LSP_MTU),
    () => rangeProblem(form.lsp_gen_interval, "lspGenInterval", ISIS_LSP_GEN_INTERVAL),
    () => rangeProblem(form.lsp_refresh_interval, "lspRefreshInterval", lspRefresh),
    () => rangeProblem(form.max_lsp_lifetime, "maxLspLifetime", ISIS_MAX_LSP_LIFETIME),
    () => rangeProblem(form.spf_interval, "spfInterval", ISIS_SPF_INTERVAL),
    () => (form.ldp_sync ? rangeProblem(form.ldp_sync_holddown, "ldpSyncHolddown", ISIS_LDP_SYNC_HOLDDOWN) : null),
  );
  if (problem || !caps?.lsp_timer_checks) return problem;
  const defaults = caps.lsp_timer_defaults;
  const value = (text: string, fallback: number) => {
    const n = isisNum(text);
    return n === null ? fallback : Number(n);
  };
  const gen = value(form.lsp_gen_interval, defaults.lsp_gen_interval);
  const refresh = value(form.lsp_refresh_interval, defaults.lsp_refresh_interval);
  const lifetime = value(form.max_lsp_lifetime, defaults.max_lsp_lifetime);
  if (gen >= refresh) return { key: "lspGenNotBelowRefresh", max: refresh - 1 };
  if (lifetime < refresh + ISIS_LSP_LIFETIME_MARGIN) {
    return { key: "lspLifetimeTooShort", min: refresh + ISIS_LSP_LIFETIME_MARGIN };
  }
  return null;
}

// ============================================================================
// Global: spf-delay-ietf (all five timers or none)
// ============================================================================

export interface IsisSpfDelayForm {
  init_delay: string;
  short_delay: string;
  long_delay: string;
  holddown: string;
  time_to_learn: string;
}

/** [form field, label] of every spf-delay-ietf timer. */
export const ISIS_SPF_DELAY_FIELDS = [
  ["init_delay", "initDelay"],
  ["short_delay", "shortDelay"],
  ["long_delay", "longDelay"],
  ["holddown", "holddown"],
  ["time_to_learn", "timeToLearn"],
] as const;

export function isisSpfDelayForm(d: IsisSpfDelayIetf): IsisSpfDelayForm {
  return {
    init_delay: isisText(d.init_delay),
    short_delay: isisText(d.short_delay),
    long_delay: isisText(d.long_delay),
    holddown: isisText(d.holddown),
    time_to_learn: isisText(d.time_to_learn),
  };
}

function spfCount(d: Record<(typeof ISIS_SPF_DELAY_FIELDS)[number][0], Scalar>): number {
  return ISIS_SPF_DELAY_FIELDS.filter(([field]) => isisNum(d[field]) !== null).length;
}

export function isisSpfDelayOps(original: IsisSpfDelayIetf, form: IsisSpfDelayForm): Op[] {
  const ops: Op[] = [];
  if (spfCount(form) === 0) {
    if (spfCount(original) > 0) push(ops, "delete_spf_delay_ietf");
    return ops;
  }
  for (const [field] of ISIS_SPF_DELAY_FIELDS) {
    const value = isisNum(form[field]);
    if (value !== null && value !== isisNum(original[field])) push(ops, `set_spf_delay_ietf_${field}`, value);
  }
  return ops;
}

export function isisSpfDelayProblem(form: IsisSpfDelayForm): IsisProblem | null {
  const count = spfCount(form);
  if (count > 0 && count < ISIS_SPF_DELAY_FIELDS.length) return { key: "spfDelayAllOrNone" };
  for (const [field, label] of ISIS_SPF_DELAY_FIELDS) {
    const problem = rangeProblem(form[field], label, ISIS_SPF_DELAY);
    if (problem) return problem;
  }
  return null;
}

// ============================================================================
// Segment routing (SR-MPLS blocks, label depth, prefix SIDs, SRv6)
// ============================================================================

export type IsisSidKind = "index" | "absolute";

export interface IsisSrPrefixForm {
  prefix: string;
  kind: IsisSidKind;
  value: string;
  explicit_null: boolean;
  no_php: boolean;
}

export interface IsisSegmentRoutingForm {
  global_block_low: string;
  global_block_high: string;
  local_block_low: string;
  local_block_high: string;
  maximum_label_depth: string;
  prefixes: IsisSrPrefixForm[];
  srv6_locator: string;
  srv6_interface: string;
  /** Keyed by the CLI msd type (``max-end-d``). */
  srv6_node_msd: Record<string, string>;
}

/** CLI msd type → config field. */
export const ISIS_SRV6_MSD_FIELDS = {
  "max-end-d": "max_end_d",
  "max-end-pop": "max_end_pop",
  "max-h-encaps": "max_h_encaps",
  "max-segs-left": "max_segs_left",
} as const;

function msdValue(sr: IsisSegmentRouting, type: string): Scalar {
  const field = ISIS_SRV6_MSD_FIELDS[type as keyof typeof ISIS_SRV6_MSD_FIELDS];
  return field ? sr.srv6_node_msd?.[field] : null;
}

function storedKinds(p: IsisSrPrefix): IsisSidKind[] {
  const kinds: IsisSidKind[] = [];
  if (p.index_value != null || p.index_explicit_null || p.index_no_php) kinds.push("index");
  if (p.absolute_value != null || p.absolute_explicit_null || p.absolute_no_php) kinds.push("absolute");
  return kinds;
}

export function emptyIsisSrPrefix(): IsisSrPrefixForm {
  return { prefix: "", kind: "index", value: "", explicit_null: false, no_php: false };
}

/** The stored leaves of one kind. */
function kindLeaves(p: IsisSrPrefix, kind: IsisSidKind): { value: string; explicit_null: boolean; no_php: boolean } {
  return kind === "index"
    ? { value: isisText(p.index_value), explicit_null: p.index_explicit_null, no_php: p.index_no_php }
    : { value: isisText(p.absolute_value), explicit_null: p.absolute_explicit_null, no_php: p.absolute_no_php };
}

export function isisSrPrefixForm(p: IsisSrPrefix): IsisSrPrefixForm {
  const kind: IsisSidKind = storedKinds(p)[0] ?? "index";
  return { prefix: p.prefix, kind, ...kindLeaves(p, kind) };
}

export function isisSegmentRoutingForm(sr: IsisSegmentRouting): IsisSegmentRoutingForm {
  const msd: Record<string, string> = {};
  for (const type of Object.keys(ISIS_SRV6_MSD_FIELDS)) msd[type] = isisText(msdValue(sr, type));
  return {
    global_block_low: isisText(sr.global_block_low),
    global_block_high: isisText(sr.global_block_high),
    local_block_low: isisText(sr.local_block_low),
    local_block_high: isisText(sr.local_block_high),
    maximum_label_depth: isisText(sr.maximum_label_depth),
    prefixes: (sr.prefixes || []).map(isisSrPrefixForm),
    srv6_locator: isisText(sr.srv6_locator),
    srv6_interface: isisText(sr.srv6_interface),
    srv6_node_msd: msd,
  };
}

/** A blank row the user never filled is dropped. */
function prefixRows(form: IsisSegmentRoutingForm): IsisSrPrefixForm[] {
  return form.prefixes.filter((p) => isisText(p.prefix) !== "" || isisText(p.value) !== "" || p.explicit_null || p.no_php);
}

function srv6Set(form: IsisSegmentRoutingForm, msdTypes: readonly string[]): boolean {
  return isisNum(form.srv6_locator) !== null || isisNum(form.srv6_interface) !== null ||
    msdTypes.some((type) => isisNum(form.srv6_node_msd[type]) !== null);
}

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const HEXTET = /^[0-9a-fA-F]{1,4}$/;

function isIpv6(address: string): boolean {
  const halves = address.split("::");
  if (halves.length > 2) return false;
  const groups = (part: string) => (part === "" ? [] : part.split(":"));
  const head = groups(halves[0]);
  const tail = halves.length === 2 ? groups(halves[1]) : [];
  const all = [...head, ...tail];
  let count = all.length;
  const last = all[all.length - 1];
  if (last !== undefined && last.includes(".")) {
    if (!IPV4.test(last)) return false;
    all.pop();
    count += 1;
  }
  if (!all.every((g) => HEXTET.test(g))) return false;
  return halves.length === 2 ? count < 8 : count === 8;
}

/** ``ipv4net`` or ``ipv6net`` (address/length). */
export function isIsisIpNetwork(text: string): boolean {
  const match = /^([^/\s]+)\/(\d{1,3})$/.exec(text);
  if (!match) return false;
  const [, address, length] = match;
  if (IPV4.test(address)) return Number(length) <= 32;
  return isIpv6(address) && Number(length) <= 128;
}

export function isisSegmentRoutingOps(
  original: IsisSegmentRouting,
  form: IsisSegmentRoutingForm,
  opts: { srv6: boolean; msdTypes: readonly string[] },
): Op[] {
  const ops: Op[] = [];
  const before = isisSegmentRoutingForm(original);

  for (const block of ["global", "local"] as const) {
    const low = `${block}_block_low` as const;
    const high = `${block}_block_high` as const;
    if (isisNum(form[low]) === null && isisNum(form[high]) === null) {
      if (isisNum(before[low]) !== null || isisNum(before[high]) !== null) push(ops, `delete_sr_${block}_block`);
      continue;
    }
    leaf(ops, `set_sr_${block}_block_low`, `delete_sr_${block}_block`, undefined, before[low], form[low]);
    leaf(ops, `set_sr_${block}_block_high`, `delete_sr_${block}_block`, undefined, before[high], form[high]);
  }
  leaf(ops, "set_sr_max_label_depth", "delete_sr_max_label_depth", undefined,
    before.maximum_label_depth, form.maximum_label_depth);

  const was = keyed(original.prefixes || [], (p) => p.prefix);
  const now = keyed(prefixRows(form), (p) => p.prefix);
  for (const prefix of was.keys()) if (!now.has(prefix)) push(ops, "delete_sr_prefix", prefix);
  for (const [prefix, p] of now) {
    const stored = was.get(prefix);
    const kinds = stored ? storedKinds(stored) : [];
    // index and absolute are exclusive: drop every stored kind but the target in the same batch.
    for (const kind of kinds) if (kind !== p.kind) push(ops, `delete_sr_prefix_${kind}`, prefix);
    const kept = stored && kinds.includes(p.kind) ? kindLeaves(stored, p.kind) : null;
    const k = p.kind;
    leaf(ops, `set_sr_prefix_${k}`, `delete_sr_prefix_${k}`, prefix, kept?.value, p.value);
    flag(ops, `set_sr_prefix_${k}_explicit_null`, `delete_sr_prefix_${k}_explicit_null`, prefix,
      kept?.explicit_null, p.explicit_null);
    flag(ops, `set_sr_prefix_${k}_no_php`, `delete_sr_prefix_${k}_no_php`, prefix, kept?.no_php, p.no_php);
  }

  if (opts.srv6) {
    if (!srv6Set(form, opts.msdTypes)) {
      if (srv6Set(before, Object.keys(ISIS_SRV6_MSD_FIELDS))) push(ops, "delete_sr_srv6");
    } else {
      leaf(ops, "set_sr_srv6_locator", "delete_sr_srv6_locator", undefined, before.srv6_locator, form.srv6_locator);
      leaf(ops, "set_sr_srv6_interface", "delete_sr_srv6_interface", undefined,
        before.srv6_interface, form.srv6_interface);
      for (const type of opts.msdTypes) {
        leaf(ops, "set_sr_srv6_node_msd", "delete_sr_srv6_node_msd", type,
          before.srv6_node_msd[type], form.srv6_node_msd[type]);
      }
    }
  }
  return ops;
}

export function isisSegmentRoutingProblem(
  form: IsisSegmentRoutingForm,
  opts: { srv6: boolean; msdTypes: readonly string[] },
): IsisProblem | null {
  const blocks = { global: [0, 0], local: [0, 0] } as Record<"global" | "local", number[]>;
  const set = { global: false, local: false };
  for (const block of ["global", "local"] as const) {
    const label = block === "global" ? "globalBlock" : "localBlock";
    const low = isisNum(form[`${block}_block_low`]);
    const high = isisNum(form[`${block}_block_high`]);
    if ((low === null) !== (high === null)) return { key: "srBlockPair", label };
    if (low === null || high === null) continue;
    const range = rangeProblem(low, label, ISIS_SR_LABEL) ?? rangeProblem(high, label, ISIS_SR_LABEL);
    if (range) return range;
    if (Number(low) >= Number(high)) return { key: "srBlockOrder", label };
    blocks[block] = [Number(low), Number(high)];
    set[block] = true;
  }
  if (set.local && !set.global) return { key: "srLocalNeedsGlobal" };
  if (set.local && set.global) {
    const [gl, gh] = blocks.global;
    const [ll, lh] = blocks.local;
    if (!(lh < gl || ll > gh)) return { key: "srBlockOverlap" };
  }
  const depth = rangeProblem(form.maximum_label_depth, "maximumLabelDepth", ISIS_SR_MAX_LABEL_DEPTH);
  if (depth) return depth;

  const seen = new Set<string>();
  for (const p of prefixRows(form)) {
    const prefix = isisText(p.prefix);
    if (!prefix) return { key: "srPrefixRequired" };
    if (!isIsisIpNetwork(prefix)) return { key: "srPrefixInvalid", name: prefix };
    if (seen.has(prefix)) return { key: "srPrefixDuplicate", name: prefix };
    seen.add(prefix);
    const value = isisNum(p.value);
    if (value === null) return { key: "srPrefixValueRequired", name: prefix };
    const range = p.kind === "index"
      ? rangeProblem(value, "prefixIndex", ISIS_SR_PREFIX_INDEX, prefix)
      : rangeProblem(value, "prefixAbsolute", ISIS_SR_PREFIX_ABSOLUTE, prefix);
    if (range) return range;
    if (p.kind === "index" && set.global) {
      const max = blocks.global[1] - blocks.global[0];
      if (Number(value) > max) return { key: "srPrefixIndexTooLarge", name: prefix, max };
    }
    if (p.explicit_null && p.no_php) return { key: "srPrefixFlags", name: prefix };
  }

  if (opts.srv6) {
    for (const type of opts.msdTypes) {
      const range = rangeProblem(form.srv6_node_msd[type], "nodeMsd", ISIS_SRV6_NODE_MSD, type);
      if (range) return range;
    }
    // 1.5 verify: "Missing interface used for installing SRv6 SIDs" whenever srv6 exists.
    if (srv6Set(form, opts.msdTypes) && isisNum(form.srv6_interface) === null) {
      return { key: "srv6InterfaceRequired" };
    }
  }
  return null;
}

// ============================================================================
// Traffic engineering (enable, address and export are independent leaves)
// ============================================================================

export interface IsisTeForm {
  enabled: boolean;
  address: string;
  export: boolean;
}

export function isisTeForm(te: IsisTrafficEngineering): IsisTeForm {
  return { enabled: te.enabled, address: isisText(te.address), export: te.export };
}

function teSet(te: IsisTeForm, teExport: boolean): boolean {
  return te.enabled || isisNum(te.address) !== null || (teExport && te.export);
}

export function isisTeOps(original: IsisTrafficEngineering, form: IsisTeForm, opts: { teExport: boolean }): Op[] {
  const ops: Op[] = [];
  const before = isisTeForm(original);
  if (!teSet(form, opts.teExport)) {
    if (teSet(before, true)) push(ops, "delete_te");
    return ops;
  }
  flag(ops, "set_te_enable", "delete_te_enable", undefined, before.enabled, form.enabled);
  leaf(ops, "set_te_address", "delete_te_address", undefined, before.address, form.address);
  if (opts.teExport) flag(ops, "set_te_export", "delete_te_export", undefined, before.export, form.export);
  return ops;
}

export function isisTeProblem(form: IsisTeForm): IsisProblem | null {
  const address = isisNum(form.address);
  if (address !== null && !IPV4.test(address)) return { key: "teAddressInvalid" };
  return null;
}

// ============================================================================
// Redistribute and default-information originate
// ============================================================================

export interface IsisRedistributeForm {
  protocol: string;
  level: string;
  metric: string;
  route_map: string;
}

export function isisRedistributeForm(entry: IsisRedistributeEntry | null): IsisRedistributeForm {
  return {
    protocol: isisText(entry?.protocol),
    level: isisText(entry?.level),
    metric: isisText(entry?.metric),
    route_map: isisText(entry?.route_map),
  };
}

/** verify: a single global level (level-1 or level-2) allows redistribute only at that level. */
export function isisRedistributeAllowedLevels(globalLevel: string | null): readonly string[] {
  const g = isisText(globalLevel);
  return g === "level-1" || g === "level-2" ? [g] : ISIS_SPLIT_LEVELS;
}

/** Levels ``protocol`` may still be redistributed at (Add offers only these). */
export function isisRedistributeFreeLevels(
  existing: IsisRedistributeEntry[],
  protocol: string,
  globalLevel: string | null = null,
): string[] {
  const p = isisText(protocol);
  return isisRedistributeAllowedLevels(globalLevel).filter(
    (l) => !existing.some((e) => isisText(e.protocol) === p && isisText(e.level) === l),
  );
}

/** Protocols with at least one level left (Add offers only these). */
export function isisRedistributeFreeProtocols(
  existing: IsisRedistributeEntry[],
  protocols: readonly string[],
  globalLevel: string | null = null,
): string[] {
  return protocols.filter((p) => isisRedistributeFreeLevels(existing, p, globalLevel).length > 0);
}

/** metric and route-map ops carry ``protocol,level,value`` (delete: ``protocol,level``). */
export function isisRedistributeOps(
  family: IsisFamily,
  original: IsisRedistributeEntry | null,
  form: IsisRedistributeForm,
): Op[] {
  const ops: Op[] = [];
  const p = `redistribute_${family}`;
  const target = `${isisText(original?.protocol ?? form.protocol)},${isisText(original?.level ?? form.level)}`;
  if (!original) push(ops, `set_${p}`, target);
  leaf(ops, `set_${p}_metric`, `delete_${p}_metric`, target, original?.metric, form.metric);
  leaf(ops, `set_${p}_route_map`, `delete_${p}_route_map`, target, original?.route_map, form.route_map);
  return ops;
}

export function isisDeleteRedistributeOps(family: IsisFamily, entry: IsisRedistributeEntry): Op[] {
  return [{ op: `delete_redistribute_${family}`, value: `${isisText(entry.protocol)},${isisText(entry.level)}` }];
}

/**
 * verify rejects redistribute at one single level while the global ``level``
 * is the other one; only ``level-1-2`` or unset allows both.
 */
export function isisRedistributeProblem(
  original: IsisRedistributeEntry | null,
  form: IsisRedistributeForm,
  existing: IsisRedistributeEntry[],
  globalLevel: string | null,
): IsisProblem | null {
  const protocol = isisText(form.protocol);
  const level = isisText(form.level);
  if (!protocol) return { key: "protocolRequired" };
  if (!level) return { key: "levelRequired" };
  if (!original && existing.some((e) => isisText(e.protocol) === protocol && isisText(e.level) === level)) {
    return { key: "redistributeDuplicate", name: protocol, level };
  }
  const global = isisText(globalLevel);
  if ((global === "level-1" || global === "level-2") && global !== level) {
    return { key: "redistributeLevelMismatch", name: global, level };
  }
  return rangeProblem(form.metric, "metric", ISIS_ROUTE_METRIC);
}

export interface IsisDefaultInfoForm {
  level: string;
  always: boolean;
  metric: string;
  route_map: string;
}

export function isisDefaultInfoForm(entry: IsisDefaultInfoEntry | null): IsisDefaultInfoForm {
  return {
    level: isisText(entry?.level),
    always: !!entry?.always,
    metric: isisText(entry?.metric),
    route_map: isisText(entry?.route_map),
  };
}

/** Levels the family has no default-information at yet (Add offers only these). */
export function isisDefaultInfoFreeLevels(existing: IsisDefaultInfoEntry[]): string[] {
  return ISIS_SPLIT_LEVELS.filter((l) => !existing.some((e) => isisText(e.level) === l));
}

export function isisDefaultInfoOps(
  family: IsisFamily,
  original: IsisDefaultInfoEntry | null,
  form: IsisDefaultInfoForm,
): Op[] {
  const ops: Op[] = [];
  const p = `default_info_${family}`;
  const level = isisText(original?.level ?? form.level);
  if (!original) push(ops, `set_${p}`, level);
  flag(ops, `set_${p}_always`, `delete_${p}_always`, level, original?.always, form.always);
  leaf(ops, `set_${p}_metric`, `delete_${p}_metric`, level, original?.metric, form.metric);
  leaf(ops, `set_${p}_route_map`, `delete_${p}_route_map`, level, original?.route_map, form.route_map);
  return ops;
}

export function isisDeleteDefaultInfoOps(family: IsisFamily, entry: IsisDefaultInfoEntry): Op[] {
  return [{ op: `delete_default_info_${family}`, value: isisText(entry.level) }];
}

export function isisDefaultInfoProblem(
  family: IsisFamily,
  original: IsisDefaultInfoEntry | null,
  form: IsisDefaultInfoForm,
  existing: IsisDefaultInfoEntry[],
): IsisProblem | null {
  const level = isisText(form.level);
  if (!level) return { key: "levelRequired" };
  if (!original && existing.some((e) => isisText(e.level) === level)) {
    return { key: "defaultInfoDuplicate", name: family, level };
  }
  return rangeProblem(form.metric, "metric", ISIS_ROUTE_METRIC);
}

// ============================================================================
// Global fast-reroute LFA (page controls, each behind a confirm dialog)
// ============================================================================

/** ``level`` null: the bare ``load-sharing disable`` node (every level). */
export function isisLoadSharingOps(level: string | null, disabled: boolean): Op[] {
  const action = disabled ? "set" : "delete";
  if (level === null) return [{ op: `${action}_frr_lfa_load_sharing_disable` }];
  const suffix = isisText(level) === "level-1" ? "level1" : "level2";
  return [{ op: `${action}_frr_lfa_load_sharing_disable_${suffix}` }];
}

/** ``level`` null: the parent ``priority-limit <priority>`` (delete only; a set needs a level). */
export function isisPriorityLimitOps(action: "set" | "delete", priority: string, level: string | null): Op[] {
  if (level === null) return [{ op: "delete_frr_lfa_priority_limit_all_levels", value: isisText(priority) }];
  return [{ op: `${action}_frr_lfa_priority_limit`, value: `${isisText(priority)},${isisText(level)}` }];
}

/** ``level`` null: the parent ``tiebreaker <type> index <n>`` (delete only; a set needs a level). */
export function isisTiebreakerOps(action: "set" | "delete", tbType: string, index: string, level: string | null): Op[] {
  if (level === null) {
    return [{ op: "delete_frr_lfa_tiebreaker_index_all_levels", value: `${isisText(tbType)},${isisText(index)}` }];
  }
  return [{
    op: `${action}_frr_lfa_tiebreaker_index`,
    value: `${isisText(tbType)},${isisText(index)},${isisText(level)}`,
  }];
}

/** ``level`` null: the bare ``prefix-list <name>`` (every level). */
export function isisRemotePrefixListOps(action: "set" | "delete", prefixList: string, level: string | null): Op[] {
  if (level === null) return [{ op: `${action}_frr_lfa_remote_prefix_list_all_levels`, value: isisText(prefixList) }];
  return [{ op: `${action}_frr_lfa_remote_prefix_list`, value: `${isisText(prefixList)},${isisText(level)}` }];
}

/**
 * Remove one chip. Deleting the last level of a tag node leaves the bare
 * parent behind (a bare remote prefix-list applies on every level, a bare
 * tiebreaker index still holds its index in verify), so the last level, and a
 * null-level chip (that bare parent), delete the parent instead.
 */
function lastLevel<T extends { level: string | null }>(existing: T[], entry: T, same: (e: T) => boolean): string | null {
  if (entry.level === null) return null;
  const others = existing.filter((e) => same(e) && e !== entry && e.level !== null && isisText(e.level) !== isisText(entry.level));
  return others.length === 0 ? null : isisText(entry.level);
}

export function isisPriorityLimitRemoveOps(existing: IsisFrrPriorityLimit[], entry: IsisFrrPriorityLimit): Op[] {
  const p = isisText(entry.priority);
  return isisPriorityLimitOps("delete", p, lastLevel(existing, entry, (e) => isisText(e.priority) === p));
}

export function isisTiebreakerRemoveOps(existing: IsisFrrTiebreaker[], entry: IsisFrrTiebreaker): Op[] {
  const t = isisText(entry.tb_type);
  const i = isisText(entry.index);
  const level = lastLevel(existing, entry, (e) => isisText(e.tb_type) === t && isisText(e.index) === i);
  return isisTiebreakerOps("delete", t, i, level);
}

export function isisRemotePrefixListRemoveOps(existing: IsisFrrRemotePrefixList[], entry: IsisFrrRemotePrefixList): Op[] {
  const n = isisText(entry.prefix_list);
  return isisRemotePrefixListOps("delete", n, lastLevel(existing, entry, (e) => isisText(e.prefix_list) === n));
}

/** verify: a level may carry only one priority-limit (a bare leftover holds no level). */
export function isisPriorityLimitFreeLevels(existing: IsisFrrPriorityLimit[]): string[] {
  return ISIS_SPLIT_LEVELS.filter((l) => !existing.some((e) => e.level !== null && isisText(e.level) === l));
}

export function isisPriorityLimitProblem(existing: IsisFrrPriorityLimit[], level: string): IsisProblem | null {
  const l = isisText(level);
  return existing.some((e) => e.level !== null && isisText(e.level) === l)
    ? { key: "priorityLimitLevelTaken", level: l }
    : null;
}

/**
 * verify allows one tiebreaker TYPE per index value, across levels; the same
 * type on another level of the same index is fine. A bare leftover index
 * (null level) still holds its index.
 */
export function isisTiebreakerProblem(
  existing: IsisFrrTiebreaker[],
  tbType: string,
  index: string,
  level: string,
): IsisProblem | null {
  const idx = isisText(index);
  const { min, max } = ISIS_TIEBREAKER_INDEX;
  if (idx === "") return { key: "range", label: "tiebreakerIndex", min, max };
  const range = rangeProblem(idx, "tiebreakerIndex", ISIS_TIEBREAKER_INDEX);
  if (range) return range;
  const type = isisText(tbType);
  const same = existing.filter((e) => Number(isisText(e.index)) === Number(idx));
  if (same.some((e) => isisText(e.tb_type) !== type)) return { key: "tiebreakerIndexTaken", name: idx };
  if (same.some((e) => e.level !== null && isisText(e.level) === isisText(level))) {
    return { key: "tiebreakerDuplicate", name: idx };
  }
  return null;
}

/**
 * Levels the Add row may offer, null meaning "all levels" (the bare node).
 * verify counts names, so once one exists only that name can grow; a bare
 * node and per-level children are one tree, so "all levels" excludes levels.
 */
export function isisRemotePrefixListFreeLevels(existing: IsisFrrRemotePrefixList[]): (string | null)[] {
  if (existing.length === 0) return [null, ...ISIS_SPLIT_LEVELS];
  if (existing.some((e) => e.level === null)) return [];
  return ISIS_SPLIT_LEVELS.filter((l) => !existing.some((e) => isisText(e.level) === l));
}

export function isisRemotePrefixListProblem(
  existing: IsisFrrRemotePrefixList[],
  prefixList: string,
  level: string | null,
): IsisProblem | null {
  const name = isisText(prefixList);
  if (!name) return { key: "prefixListRequired" };
  const current = existing[0] ? isisText(existing[0].prefix_list) : null;
  if (current !== null && current !== name) return { key: "remotePrefixListExists", name: current };
  if (!isisRemotePrefixListFreeLevels(existing).includes(level === null ? null : isisText(level))) {
    return { key: "remotePrefixListLevelTaken", name };
  }
  return null;
}
