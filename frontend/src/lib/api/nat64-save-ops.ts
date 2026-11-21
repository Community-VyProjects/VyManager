import type {
  NAT64BatchOperation,
  NAT64SourceRule,
  NAT64TranslationPool,
  NAT64TranslationPoolProtocol,
} from "./nat64";

/** Lab `val_help` of `nat64 source rule <n> match mark` (1.4 and 1.5). */
export const MATCH_MARK_RANGE = { min: 1, max: 2147483647 } as const;

export interface NAT64RuleFields {
  description: string;
  sourcePrefix: string;
  matchMark: string;
  disable: boolean;
}

export interface NAT64PoolFields {
  address: string;
  description: string;
  port: string;
  protocol: NAT64TranslationPoolProtocol;
  disable: boolean;
}

export type NAT64RuleProblem = "sourcePrefixRequired" | "matchMarkRange";
export type NAT64PoolProblem = "addressRequired" | "portRequired";

const NO_PROTOCOL: NAT64TranslationPoolProtocol = { tcp: false, udp: false, icmp: false };

/** Text leaf as both the save check and the emit read it. */
function text(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/** Optional value leaf: a set replaces it, a cleared field deletes it. */
function leaf(
  ops: NAT64BatchOperation[],
  setOp: string,
  deleteOp: string,
  before: string | null | undefined,
  after: string,
): void {
  const value = text(after);
  if (value === text(before)) return;
  ops.push(value ? { op: setOp, value } : { op: deleteOp });
}

/**
 * Leaf the lab commit requires on its parent: it is only ever replaced. The
 * save check rejects a blank value; the leaf goes with the parent delete.
 */
function requiredLeaf(
  ops: NAT64BatchOperation[],
  setOp: string,
  before: string | null | undefined,
  after: string,
): void {
  const value = text(after);
  if (value && value !== text(before)) ops.push({ op: setOp, value });
}

function flag(
  ops: NAT64BatchOperation[],
  setOp: string,
  deleteOp: string,
  before: boolean,
  after: boolean,
): void {
  if (after && !before) ops.push({ op: setOp });
  else if (!after && before) ops.push({ op: deleteOp });
}

/**
 * A rule the lab commit would reject: both labs refuse a rule with no
 * `source prefix`, and `match mark` takes 1-2147483647.
 */
export function nat64RuleProblem(fields: NAT64RuleFields): NAT64RuleProblem | null {
  if (!text(fields.sourcePrefix)) return "sourcePrefixRequired";
  const mark = text(fields.matchMark);
  if (mark && (!/^[1-9]\d{0,9}$/.test(mark) || Number(mark) > MATCH_MARK_RANGE.max)) {
    return "matchMarkRange";
  }
  return null;
}

/** A pool the lab commit would reject: both labs require `address` and `port`. */
export function nat64PoolProblem(fields: NAT64PoolFields): NAT64PoolProblem | null {
  if (!text(fields.address)) return "addressRequired";
  if (!text(fields.port)) return "portRequired";
  return null;
}

export function buildRuleCreateOps(fields: NAT64RuleFields): NAT64BatchOperation[] {
  return [{ op: "set_source_rule" }, ...buildRuleUpdateOps(null, fields)];
}

/** Ops that turn `current` (null for a new rule) into `fields`. */
export function buildRuleUpdateOps(
  current: NAT64SourceRule | null,
  fields: NAT64RuleFields,
): NAT64BatchOperation[] {
  const ops: NAT64BatchOperation[] = [];
  leaf(ops, "set_source_rule_description", "delete_source_rule_description", current?.description, fields.description);
  requiredLeaf(ops, "set_source_rule_source_prefix", current?.source_prefix, fields.sourcePrefix);
  leaf(ops, "set_source_rule_match_mark", "delete_source_rule_match_mark", current?.match_mark, fields.matchMark);
  flag(ops, "set_source_rule_disable", "delete_source_rule_disable", current?.disable ?? false, fields.disable);
  return ops;
}

export function buildPoolCreateOps(fields: NAT64PoolFields): NAT64BatchOperation[] {
  return [{ op: "set_source_rule_translation_pool" }, ...buildPoolUpdateOps(null, fields)];
}

/** Ops that turn `current` (null for a new pool) into `fields`. */
export function buildPoolUpdateOps(
  current: NAT64TranslationPool | null,
  fields: NAT64PoolFields,
): NAT64BatchOperation[] {
  const ops: NAT64BatchOperation[] = [];
  requiredLeaf(ops, "set_source_rule_translation_pool_address", current?.address, fields.address);
  leaf(
    ops,
    "set_source_rule_translation_pool_description",
    "delete_source_rule_translation_pool_description",
    current?.description,
    fields.description,
  );
  requiredLeaf(ops, "set_source_rule_translation_pool_port", current?.port, fields.port);
  const protocol = current?.protocol ?? NO_PROTOCOL;
  flag(
    ops,
    "set_source_rule_translation_pool_protocol_tcp",
    "delete_source_rule_translation_pool_protocol_tcp",
    protocol.tcp,
    fields.protocol.tcp,
  );
  flag(
    ops,
    "set_source_rule_translation_pool_protocol_udp",
    "delete_source_rule_translation_pool_protocol_udp",
    protocol.udp,
    fields.protocol.udp,
  );
  flag(
    ops,
    "set_source_rule_translation_pool_protocol_icmp",
    "delete_source_rule_translation_pool_protocol_icmp",
    protocol.icmp,
    fields.protocol.icmp,
  );
  flag(
    ops,
    "set_source_rule_translation_pool_disable",
    "delete_source_rule_translation_pool_disable",
    current?.disable ?? false,
    fields.disable,
  );
  return ops;
}
