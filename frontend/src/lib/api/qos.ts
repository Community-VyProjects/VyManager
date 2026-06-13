import { apiClient } from "./client";

// ============================================================================
// Backend config types (mirror routers/qos/qos.py)
// ============================================================================

export interface QoSMatchAddr {
  destination_address: string | null;
  destination_port: string | null;
  source_address: string | null;
  source_port: string | null;
  dscp: string | null;
  max_length: string | null;
  protocol: string | null;
  tcp_ack: boolean;
  tcp_syn: boolean;
}

export interface QoSMatchEther {
  destination: string | null;
  source: string | null;
  protocol: string | null;
}

export interface QoSMatchRule {
  name: string;
  description: string | null;
  interface: string | null;
  mark: string | null;
  vif: string | null;
  ether: QoSMatchEther | null;
  ip: QoSMatchAddr | null;
  ipv6: QoSMatchAddr | null;
}

export interface QoSServiceCurve {
  d: string | null;
  m1: string | null;
  m2: string | null;
}

export interface QoSClass {
  class_id: string;
  description: string | null;
  average_packet: string | null;
  bandwidth: string | null;
  burst: string | null;
  ceiling: string | null;
  codel_quantum: string | null;
  exceed: string | null;
  flows: string | null;
  interval: string | null;
  mark_probability: string | null;
  maximum_threshold: string | null;
  minimum_threshold: string | null;
  mtu: string | null;
  not_exceed: string | null;
  priority: string | null;
  quantum: string | null;
  queue_limit: string | null;
  queue_type: string | null;
  set_dscp: string | null;
  target: string | null;
  linkshare: QoSServiceCurve | null;
  realtime: QoSServiceCurve | null;
  upperlimit: QoSServiceCurve | null;
  match_groups: string[];
  matches: QoSMatchRule[];
}

export interface QoSPrecedence {
  precedence: string;
  average_packet: string | null;
  mark_probability: string | null;
  maximum_threshold: string | null;
  minimum_threshold: string | null;
  queue_limit: string | null;
}

export interface QoSPolicy {
  type: string;
  name: string;
  description: string | null;
  bandwidth: string | null;
  rtt: string | null;
  queue_limit: string | null;
  hash_interval: string | null;
  codel_quantum: string | null;
  flows: string | null;
  interval: string | null;
  target: string | null;
  corruption: string | null;
  delay: string | null;
  duplicate: string | null;
  loss: string | null;
  reordering: string | null;
  burst: string | null;
  latency: string | null;
  flow_isolation: string | null;
  flow_isolation_nat: boolean;
  classes: QoSClass[];
  default: QoSClass | null;
  precedences: QoSPrecedence[];
}

export interface QoSInterface {
  name: string;
  ingress: string | null;
  egress: string | null;
}

export interface QoSTrafficMatchGroup {
  name: string;
  description: string | null;
  match_groups: string[];
  matches: QoSMatchRule[];
}

export interface QoSConfig {
  interfaces: QoSInterface[];
  policies: QoSPolicy[];
  traffic_match_groups: QoSTrafficMatchGroup[];
}

export interface QoSCapabilities {
  version: string;
  features: {
    qos: { supported: boolean; description: string };
    policy_types: string[];
    traffic_match_group: { supported: boolean; description: string };
    match_group: { supported: boolean; description: string };
    shaper_hfsc: { supported: boolean };
    enums: {
      queue_types: string[];
      exceed_actions: string[];
      flow_isolation_modes: string[];
      dscp_names: string[];
      ether_protocols: string[];
      bandwidth_suffixes: string[];
    };
  };
  version_info: { is_1_4: boolean; is_1_5: boolean };
}

export interface BatchOperation {
  op: string;
  value?: string | null;
}

// ----- Live statistics (mirror routers/qos/qos.py, from `show qos shaper detail`) -----

export interface QoSClassStats {
  class_name: string;          // "root", "default", or a class id like "10"
  queue_type: string | null;   // htb, fq_codel, sfq, ...
  direction: string | null;    // egress / ingress
  bandwidth: number | null;    // configured rate, bits/s
  ceiling: number | null;      // max bandwidth (ceil), bits/s
  bytes: number;
  packets: number;
  drops: number;
  queued: number;
  overlimits: number;
  requeues: number;
  lended: number;
  borrowed: number;
  giants: number;
}

export interface QoSInterfaceStats {
  interface: string;
  policy_name: string | null;
  classes: QoSClassStats[];
}

export interface QoSCakeTin {
  name: string;                    // "Bulk", "Best Effort", "Voice", "Tin 0", ...
  threshold_rate: number | null;   // bits/s
  sent_bytes: number;
  sent_packets: number;
  drops: number;
  marks: number;
  backlog_bytes: number;
}

export interface QoSCakeStats {
  interface: string;
  policy_name: string | null;
  bandwidth: number | null;         // configured shaper rate, bits/s (null = unlimited)
  diffserv: string | null;          // diffserv3 / besteffort / ...
  flow_mode: string | null;         // flows / triple-isolate / ...
  capacity_estimate: number | null; // bits/s
  memory_used: number | null;       // bytes
  memory_limit: number | null;      // bytes
  bytes: number;                     // aggregate counters
  packets: number;
  drops: number;
  overlimits: number;
  requeues: number;
  backlog: number;
  tins: QoSCakeTin[];
}

export interface QoSStatsResponse {
  applied: boolean;                  // false when no QoS is applied to any interface
  interfaces: QoSInterfaceStats[];   // shaper / shaper-hfsc policies
  cake: QoSCakeStats[];              // cake policies
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}

// ============================================================================
// Editing drafts (flat field maps make serialization trivial)
// ============================================================================

export interface MatchDraft {
  name: string;
  values: Record<string, string>; // field path -> value, e.g. "ip/destination/port"
  flags: string[]; // valueless leaves, e.g. "ip/tcp/syn"
}

export interface ClassDraft {
  classId: string; // class id, or "default"
  values: Record<string, string>;
  matchGroups: string[];
  matches: MatchDraft[];
}

export interface PrecedenceDraft {
  precedence: string;
  values: Record<string, string>;
}

export interface PolicyDraft {
  type: string;
  name: string;
  values: Record<string, string>;
  flags: string[]; // e.g. "flow-isolation/host", "flow-isolation-nat"
  classes: ClassDraft[];
  default: ClassDraft | null;
  precedences: PrecedenceDraft[];
}

export interface TmgDraft {
  name: string;
  description: string;
  matchGroups: string[];
  matches: MatchDraft[];
}

// ============================================================================
// Backend -> draft converters (seed editor state from existing config)
// ============================================================================

function matchToDraft(m: QoSMatchRule): MatchDraft {
  const values: Record<string, string> = {};
  const flags: string[] = [];
  if (m.description) values["description"] = m.description;
  if (m.interface) values["interface"] = m.interface;
  if (m.mark) values["mark"] = m.mark;
  if (m.vif) values["vif"] = m.vif;
  if (m.ether) {
    if (m.ether.destination) values["ether/destination"] = m.ether.destination;
    if (m.ether.source) values["ether/source"] = m.ether.source;
    if (m.ether.protocol) values["ether/protocol"] = m.ether.protocol;
  }
  (["ip", "ipv6"] as const).forEach((proto) => {
    const a = m[proto];
    if (!a) return;
    if (a.destination_address) values[`${proto}/destination/address`] = a.destination_address;
    if (a.destination_port) values[`${proto}/destination/port`] = a.destination_port;
    if (a.source_address) values[`${proto}/source/address`] = a.source_address;
    if (a.source_port) values[`${proto}/source/port`] = a.source_port;
    if (a.dscp) values[`${proto}/dscp`] = a.dscp;
    if (a.max_length) values[`${proto}/max-length`] = a.max_length;
    if (a.protocol) values[`${proto}/protocol`] = a.protocol;
    if (a.tcp_ack) flags.push(`${proto}/tcp/ack`);
    if (a.tcp_syn) flags.push(`${proto}/tcp/syn`);
  });
  return { name: m.name, values, flags };
}

const CLASS_SCALAR_KEYS: Array<[keyof QoSClass, string]> = [
  ["description", "description"],
  ["average_packet", "average-packet"],
  ["bandwidth", "bandwidth"],
  ["burst", "burst"],
  ["ceiling", "ceiling"],
  ["codel_quantum", "codel-quantum"],
  ["exceed", "exceed"],
  ["flows", "flows"],
  ["interval", "interval"],
  ["mark_probability", "mark-probability"],
  ["maximum_threshold", "maximum-threshold"],
  ["minimum_threshold", "minimum-threshold"],
  ["mtu", "mtu"],
  ["not_exceed", "not-exceed"],
  ["priority", "priority"],
  ["quantum", "quantum"],
  ["queue_limit", "queue-limit"],
  ["queue_type", "queue-type"],
  ["set_dscp", "set-dscp"],
  ["target", "target"],
];

function classToDraft(c: QoSClass): ClassDraft {
  const values: Record<string, string> = {};
  for (const [field, key] of CLASS_SCALAR_KEYS) {
    const v = c[field];
    if (typeof v === "string" && v !== "") values[key] = v;
  }
  (["linkshare", "realtime", "upperlimit"] as const).forEach((curve) => {
    const sc = c[curve];
    if (!sc) return;
    if (sc.d) values[`${curve}/d`] = sc.d;
    if (sc.m1) values[`${curve}/m1`] = sc.m1;
    if (sc.m2) values[`${curve}/m2`] = sc.m2;
  });
  return {
    classId: c.class_id,
    values,
    matchGroups: [...c.match_groups],
    matches: c.matches.map(matchToDraft),
  };
}

const POLICY_SCALAR_KEYS: Array<[keyof QoSPolicy, string]> = [
  ["description", "description"],
  ["bandwidth", "bandwidth"],
  ["rtt", "rtt"],
  ["queue_limit", "queue-limit"],
  ["hash_interval", "hash-interval"],
  ["codel_quantum", "codel-quantum"],
  ["flows", "flows"],
  ["interval", "interval"],
  ["target", "target"],
  ["corruption", "corruption"],
  ["delay", "delay"],
  ["duplicate", "duplicate"],
  ["loss", "loss"],
  ["reordering", "reordering"],
  ["burst", "burst"],
  ["latency", "latency"],
];

export function policyToDraft(p: QoSPolicy): PolicyDraft {
  const values: Record<string, string> = {};
  for (const [field, key] of POLICY_SCALAR_KEYS) {
    const v = p[field];
    if (typeof v === "string" && v !== "") values[key] = v;
  }
  const flags: string[] = [];
  if (p.flow_isolation) flags.push(`flow-isolation/${p.flow_isolation}`);
  if (p.flow_isolation_nat) flags.push("flow-isolation-nat");
  return {
    type: p.type,
    name: p.name,
    values,
    flags,
    classes: p.classes.map(classToDraft),
    default: p.default ? classToDraft(p.default) : null,
    precedences: p.precedences.map((pr) => {
      const v: Record<string, string> = {};
      if (pr.average_packet) v["average-packet"] = pr.average_packet;
      if (pr.mark_probability) v["mark-probability"] = pr.mark_probability;
      if (pr.maximum_threshold) v["maximum-threshold"] = pr.maximum_threshold;
      if (pr.minimum_threshold) v["minimum-threshold"] = pr.minimum_threshold;
      if (pr.queue_limit) v["queue-limit"] = pr.queue_limit;
      return { precedence: pr.precedence, values: v };
    }),
  };
}

export function tmgToDraft(g: QoSTrafficMatchGroup): TmgDraft {
  return {
    name: g.name,
    description: g.description ?? "",
    matchGroups: [...g.match_groups],
    matches: g.matches.map(matchToDraft),
  };
}

export function emptyMatchDraft(name: string): MatchDraft {
  return { name, values: {}, flags: [] };
}

export function emptyClassDraft(classId: string): ClassDraft {
  return { classId, values: {}, matchGroups: [], matches: [] };
}

// ============================================================================
// Service
// ============================================================================

class QoSService {
  async getCapabilities(): Promise<QoSCapabilities> {
    return apiClient.get<QoSCapabilities>("/vyos/qos/capabilities");
  }

  async getConfig(refresh = false): Promise<QoSConfig> {
    return apiClient.get<QoSConfig>("/vyos/qos/config", { refresh: refresh.toString() });
  }

  /** Live per-class shaper counters (sampled; poll for real-time bandwidth). */
  async getStats(): Promise<QoSStatsResponse> {
    return apiClient.get<QoSStatsResponse>("/vyos/qos/stats");
  }

  private async batch(operations: BatchOperation[]): Promise<VyOSResponse> {
    const result = await apiClient.post<VyOSResponse>("/vyos/qos/batch", { operations });
    if (!result.success) throw new Error(result.error || "Operation failed");
    return result;
  }

  // ------------------------------------------------------------ interfaces
  async saveInterface(
    isEdit: boolean,
    binding: { name: string; ingress: string; egress: string }
  ): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const name = binding.name.trim();
    if (isEdit) ops.push({ op: "delete_interface", value: name });
    if (binding.ingress.trim()) ops.push({ op: "set_interface_ingress", value: `${name},${binding.ingress.trim()}` });
    if (binding.egress.trim()) ops.push({ op: "set_interface_egress", value: `${name},${binding.egress.trim()}` });
    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async deleteInterface(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_interface", value: name }]);
  }

  // -------------------------------------------------------------- policies
  async savePolicy(isEdit: boolean, draft: PolicyDraft): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const { type, name } = draft;
    if (isEdit) ops.push({ op: "delete_policy", value: `${type},${name}` });
    this.serializePolicy(ops, draft);
    if (ops.length === 0) return { success: true };
    return this.batch(ops);
  }

  async deletePolicy(type: string, name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_policy", value: `${type},${name}` }]);
  }

  // -------------------------------------------------- traffic match groups
  async saveTmg(isEdit: boolean, draft: TmgDraft): Promise<VyOSResponse> {
    const ops: BatchOperation[] = [];
    const g = draft.name.trim();
    if (isEdit) ops.push({ op: "delete_tmg", value: g });
    ops.push({ op: "set_tmg", value: g });
    if (draft.description.trim()) ops.push({ op: "set_tmg_field", value: `${g},description,${draft.description.trim()}` });
    for (const ref of draft.matchGroups) ops.push({ op: "set_tmg_match_group", value: `${g},${ref}` });
    for (const m of draft.matches) this.serializeTmgMatch(ops, g, m);
    return this.batch(ops);
  }

  async deleteTmg(name: string): Promise<VyOSResponse> {
    return this.batch([{ op: "delete_tmg", value: name }]);
  }

  // ----------------------------------------------------------- serializers
  private serializePolicy(ops: BatchOperation[], draft: PolicyDraft): void {
    const { type, name } = draft;
    ops.push({ op: "set_policy", value: `${type},${name}` });
    for (const [field, value] of Object.entries(draft.values)) {
      if (value !== "") ops.push({ op: "set_policy_field", value: `${type},${name},${field},${value}` });
    }
    for (const flag of draft.flags) {
      ops.push({ op: "set_policy_flag", value: `${type},${name},${flag}` });
    }
    for (const pr of draft.precedences) {
      const base = `precedence/${pr.precedence}`;
      const entries = Object.entries(pr.values).filter(([, v]) => v !== "");
      if (entries.length === 0) {
        ops.push({ op: "set_policy_flag", value: `${type},${name},${base}` });
      } else {
        for (const [field, value] of entries) {
          ops.push({ op: "set_policy_field", value: `${type},${name},${base}/${field},${value}` });
        }
      }
    }
    for (const cls of draft.classes) this.serializeClass(ops, type, name, cls);
    if (draft.default) this.serializeClass(ops, type, name, draft.default);
  }

  private serializeClass(ops: BatchOperation[], type: string, name: string, cls: ClassDraft): void {
    const id = cls.classId;
    ops.push({ op: "set_class", value: `${type},${name},${id}` });
    for (const [field, value] of Object.entries(cls.values)) {
      if (value !== "") ops.push({ op: "set_class_field", value: `${type},${name},${id},${field},${value}` });
    }
    for (const ref of cls.matchGroups) {
      ops.push({ op: "set_class_match_group", value: `${type},${name},${id},${ref}` });
    }
    for (const m of cls.matches) {
      ops.push({ op: "set_class_match", value: `${type},${name},${id},${m.name}` });
      for (const [field, value] of Object.entries(m.values)) {
        if (value !== "") ops.push({ op: "set_class_match_field", value: `${type},${name},${id},${m.name},${field},${value}` });
      }
      for (const flag of m.flags) {
        ops.push({ op: "set_class_match_flag", value: `${type},${name},${id},${m.name},${flag}` });
      }
    }
  }

  private serializeTmgMatch(ops: BatchOperation[], group: string, m: MatchDraft): void {
    ops.push({ op: "set_tmg_match", value: `${group},${m.name}` });
    for (const [field, value] of Object.entries(m.values)) {
      if (value !== "") ops.push({ op: "set_tmg_match_field", value: `${group},${m.name},${field},${value}` });
    }
    for (const flag of m.flags) {
      ops.push({ op: "set_tmg_match_flag", value: `${group},${m.name},${flag}` });
    }
  }
}

export const qosService = new QoSService();
