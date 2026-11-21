import type {
  NAT66BatchOperation,
  NAT66DestinationRule,
  NAT66RuleGroup,
  NAT66RuleMatch,
  NAT66SourceRule,
} from "./nat66";

export type NAT66RuleType = "source" | "destination";
export type NAT66Side = "source" | "destination";

/** Protocols whose rules can match or translate a port (nft needs a transport match). */
export const PORT_PROTOCOLS: readonly string[] = ["tcp", "udp", "tcp_udp"];

/** Group types of which 1.5 verify allows one per side. */
const EXCLUSIVE_GROUP_TYPES: readonly string[] = ["address-group", "domain-group", "network-group"];

/** One side (source or destination) of a rule as the dialog edits it. */
export interface NAT66SideFields {
  /** ``prefix`` on source rules, ``address`` on destination rules. */
  match: string;
  port: string;
  /** Group name per CLI group type (``address-group`` ...); "" for none. */
  groups: Record<string, string>;
}

export interface NAT66RuleFields {
  description: string;
  /** "" leaves the protocol unset (the lab default, all). */
  protocol: string;
  interfaceName: string;
  source: NAT66SideFields;
  destination: NAT66SideFields;
  /** ``masquerade`` or an IPv6 address/prefix. */
  translationAddress: string;
  translationPort: string;
  disable: boolean;
  exclude: boolean;
  log: boolean;
}

export type NAT66RuleProblem = "translationRequired" | "oneAddressGroup";

/** Text leaf as both the save check and the emit read it. */
function text(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/** Client key of a CLI group type: ``address-group`` -> ``address_group``. */
export function groupKey(groupType: string): keyof NAT66RuleGroup {
  return groupType.replace(/-/g, "_") as keyof NAT66RuleGroup;
}

function portsApply(protocol: string): boolean {
  return PORT_PROTOCOLS.includes(text(protocol));
}

/** Port values the emit sends: blank when the protocol has no ports. */
function effectivePort(fields: NAT66RuleFields, value: string): string {
  return portsApply(fields.protocol) ? text(value) : "";
}

function effectiveGroup(fields: NAT66RuleFields, groupType: string, value: string | undefined): string {
  if (groupType === "port-group" && !portsApply(fields.protocol)) return "";
  return text(value);
}

/** Optional value leaf: a set replaces it, a cleared field deletes it. */
function leaf(
  ops: NAT66BatchOperation[],
  setOp: string,
  deleteOp: string,
  before: string | null | undefined,
  after: string,
): void {
  const value = text(after);
  if (value === text(before)) return;
  ops.push(value ? { op: setOp, value } : { op: deleteOp });
}

function flag(
  ops: NAT66BatchOperation[],
  setOp: string,
  deleteOp: string,
  before: boolean,
  after: boolean,
): void {
  if (after && !before) ops.push({ op: setOp });
  else if (!after && before) ops.push({ op: deleteOp });
}

/** Blank side fields for every group type the device has. */
export function emptySide(groupTypes: readonly string[]): NAT66SideFields {
  return { match: "", port: "", groups: Object.fromEntries(groupTypes.map((type) => [type, ""])) };
}

/** Side fields loaded from a parsed rule side. */
export function sideFields(
  side: NAT66RuleMatch | null | undefined,
  matchKey: "prefix" | "address",
  groupTypes: readonly string[],
): NAT66SideFields {
  return {
    match: side?.[matchKey] ?? "",
    port: side?.port ?? "",
    groups: Object.fromEntries(groupTypes.map((type) => [type, side?.group?.[groupKey(type)] ?? ""])),
  };
}

/**
 * A rule the lab commit would reject: both rule types need a translation
 * address unless they are exclude rules (1.4 and 1.5), and 1.5 allows one
 * address, domain or network group per side.
 */
export function nat66RuleProblem(fields: NAT66RuleFields): NAT66RuleProblem | null {
  if (!fields.exclude && !text(fields.translationAddress)) {
    return "translationRequired";
  }
  for (const side of [fields.source, fields.destination]) {
    const exclusive = EXCLUSIVE_GROUP_TYPES.filter((type) => effectiveGroup(fields, type, side.groups[type]));
    if (exclusive.length > 1) return "oneAddressGroup";
  }
  return null;
}

function sideOps(
  ops: NAT66BatchOperation[],
  ruleType: NAT66RuleType,
  side: NAT66Side,
  before: NAT66RuleMatch | null | undefined,
  fields: NAT66RuleFields,
  groupTypes: readonly string[],
): void {
  const prefix = `${ruleType}_rule_${side}`;
  const matchKey = ruleType === "source" ? "prefix" : "address";
  const after = fields[side];
  leaf(ops, `set_${prefix}_${matchKey}`, `delete_${prefix}_${matchKey}`, before?.[matchKey], after.match);
  leaf(ops, `set_${prefix}_port`, `delete_${prefix}_port`, before?.port, effectivePort(fields, after.port));
  for (const type of groupTypes) {
    const raw = after.groups[type];
    if (raw === undefined) continue; // not loaded into the dialog: leave it as it is
    const was = text(before?.group?.[groupKey(type)]);
    const now = effectiveGroup(fields, type, raw);
    if (now === was) continue;
    ops.push(
      now
        ? { op: `set_${prefix}_group`, value: `${type}:${now}` }
        : { op: `delete_${prefix}_group`, value: type },
    );
  }
}

/** Ops that turn `current` (null for a new rule) into `fields`. */
export function buildRuleUpdateOps(
  ruleType: NAT66RuleType,
  current: NAT66SourceRule | NAT66DestinationRule | null,
  fields: NAT66RuleFields,
  groupTypes: readonly string[],
): NAT66BatchOperation[] {
  const r = `${ruleType}_rule`;
  const ops: NAT66BatchOperation[] = [];
  const iface = ruleType === "source" ? "outbound" : "inbound";
  const currentIface =
    ruleType === "source"
      ? (current as NAT66SourceRule | null)?.outbound_interface
      : (current as NAT66DestinationRule | null)?.inbound_interface;
  leaf(ops, `set_${r}_description`, `delete_${r}_description`, current?.description, fields.description);
  leaf(ops, `set_${r}_protocol`, `delete_${r}_protocol`, current?.protocol, fields.protocol);
  leaf(ops, `set_${r}_${iface}_interface_name`, `delete_${r}_${iface}_interface_name`, currentIface, fields.interfaceName);
  sideOps(ops, ruleType, "source", current?.source, fields, groupTypes);
  sideOps(ops, ruleType, "destination", current?.destination, fields, groupTypes);
  leaf(
    ops,
    `set_${r}_translation_address`,
    `delete_${r}_translation_address`,
    current?.translation?.address,
    fields.translationAddress,
  );
  leaf(
    ops,
    `set_${r}_translation_port`,
    `delete_${r}_translation_port`,
    current?.translation?.port,
    effectivePort(fields, fields.translationPort),
  );
  flag(ops, `set_${r}_exclude`, `delete_${r}_exclude`, current?.exclude ?? false, fields.exclude);
  flag(ops, `set_${r}_log`, `delete_${r}_log`, current?.log ?? false, fields.log);
  flag(ops, `set_${r}_disable`, `delete_${r}_disable`, current?.disable ?? false, fields.disable);
  return ops;
}

export function buildRuleCreateOps(
  ruleType: NAT66RuleType,
  fields: NAT66RuleFields,
  groupTypes: readonly string[],
): NAT66BatchOperation[] {
  return [{ op: `set_${ruleType}_rule` }, ...buildRuleUpdateOps(ruleType, null, fields, groupTypes)];
}
