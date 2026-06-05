// Static field schemas that drive the QoS editor forms. Sourced from the VyOS
// `qos` templates. Kept version-agnostic; version gating (traffic-match-group,
// match-group) is handled via capabilities in the components.

export type FieldKind = "text" | "number" | "bandwidth" | "select" | "dscp";

export interface FieldDef {
  key: string; // vyos field path ("/"-joined), e.g. "queue-type" or "linkshare/m1"
  label: string;
  kind: FieldKind;
  options?: string[]; // for kind "select"
  help?: string;
  placeholder?: string;
}

export interface PolicyTypeMeta {
  label: string;
  description: string;
  policyFields: FieldDef[];
  hasClasses: boolean;
  hasDefault: boolean;
  classFields: FieldDef[];
  classIdHelp?: string;
  flowIsolation?: boolean;
  precedence?: boolean;
}

const BW_HELP = "Number with optional suffix: bit, kbit, mbit, gbit, tbit, or % of link";
const BW_PLACEHOLDER = "e.g. 100mbit or 50%";

const f = (key: string, label: string, kind: FieldKind, extra: Partial<FieldDef> = {}): FieldDef => ({
  key,
  label,
  kind,
  ...extra,
});

const bandwidth = (key = "bandwidth", label = "Bandwidth"): FieldDef =>
  f(key, label, "bandwidth", { help: BW_HELP, placeholder: BW_PLACEHOLDER });

// Shared class scalar fields used by several policy types -------------------

const QUEUE_TYPE = (def: string): FieldDef =>
  f("queue-type", "Queue Type", "select", {
    options: ["drop-tail", "fair-queue", "fq-codel", "priority", "random-detect"],
    help: `Default: ${def}`,
  });

const CODEL_FIELDS: FieldDef[] = [
  f("codel-quantum", "CoDel Quantum", "number", { help: "Bytes used as deficit (default 1514)" }),
  f("flows", "Flows", "number", { help: "Number of flows (1-65536)" }),
  f("interval", "Interval", "number", { help: "Delay measurement interval, ms (default 100)" }),
  f("target", "Target", "number", { help: "Min persistent queue delay, ms (default 5)" }),
];

// HFSC service curve fields --------------------------------------------------

const curve = (name: string, label: string): FieldDef[] => [
  f(`${name}/m1`, `${label} m1`, "text", { help: "Burst rate (e.g. 0bit, 50mbit, 50%)" }),
  f(`${name}/d`, `${label} delay`, "number", { help: "Service curve delay, ms" }),
  f(`${name}/m2`, `${label} m2`, "text", { help: "Steady-state rate (e.g. 100%, 50mbit)" }),
];

// ---------------------------------------------------------------------------

export const POLICY_TYPE_META: Record<string, PolicyTypeMeta> = {
  cake: {
    label: "CAKE",
    description: "Common Applications Kept Enhanced",
    policyFields: [
      bandwidth(),
      f("rtt", "RTT", "number", { help: "Round-trip-time for AQM, ms (default 100)" }),
    ],
    hasClasses: false,
    hasDefault: false,
    classFields: [],
    flowIsolation: true,
  },
  "drop-tail": {
    label: "Drop Tail",
    description: "Packet-limited FIFO queue",
    policyFields: [f("queue-limit", "Queue Limit", "number", { help: "Queue size in packets" })],
    hasClasses: false,
    hasDefault: false,
    classFields: [],
  },
  "fair-queue": {
    label: "Fair Queue",
    description: "Stochastic Fairness Queueing",
    policyFields: [
      f("hash-interval", "Hash Interval", "number", { help: "Perturbation interval, s (0 = none)" }),
      f("queue-limit", "Queue Limit", "number", { help: "Queue size in packets (default 127)" }),
    ],
    hasClasses: false,
    hasDefault: false,
    classFields: [],
  },
  "fq-codel": {
    label: "FQ-CoDel",
    description: "Fair Queuing with Controlled Delay",
    policyFields: [
      f("codel-quantum", "CoDel Quantum", "number", { help: "Bytes used as deficit (default 1514)" }),
      f("flows", "Flows", "number", { help: "Number of flows (1-65536)" }),
      f("interval", "Interval", "number", { help: "Delay measurement interval, ms (default 100)" }),
      f("queue-limit", "Queue Limit", "number", { help: "Queue size in packets (default 10240)" }),
      f("target", "Target", "number", { help: "Min persistent queue delay, ms (default 5)" }),
    ],
    hasClasses: false,
    hasDefault: false,
    classFields: [],
  },
  "network-emulator": {
    label: "Network Emulator",
    description: "Emulate delay, loss, corruption, etc.",
    policyFields: [
      bandwidth(),
      f("delay", "Delay", "number", { help: "Added delay, ms" }),
      f("loss", "Loss", "number", { help: "Loss probability, % of packets" }),
      f("corruption", "Corruption", "number", { help: "Corrupted packets, %" }),
      f("duplicate", "Duplicate", "number", { help: "Duplicated packets, %" }),
      f("reordering", "Reordering", "number", { help: "Reordered packets, %" }),
      f("queue-limit", "Queue Limit", "number", { help: "Queue size in packets" }),
    ],
    hasClasses: false,
    hasDefault: false,
    classFields: [],
  },
  "rate-control": {
    label: "Rate Control",
    description: "Rate limiting (Token Bucket Filter)",
    policyFields: [
      bandwidth(),
      f("burst", "Burst", "text", { help: "Burst size in bytes (e.g. 15k)" }),
      f("latency", "Latency", "number", { help: "Maximum latency, ms (default 50)" }),
    ],
    hasClasses: false,
    hasDefault: false,
    classFields: [],
  },
  "random-detect": {
    label: "Random Detect",
    description: "Weighted Random Early Detection",
    policyFields: [bandwidth("bandwidth", "Bandwidth (or 'auto')")],
    hasClasses: false,
    hasDefault: false,
    classFields: [],
    precedence: true,
  },
  limiter: {
    label: "Limiter",
    description: "Traffic input limiting policy",
    policyFields: [],
    hasClasses: true,
    hasDefault: true,
    classIdHelp: "Class identifier (1-4090)",
    classFields: [
      bandwidth(),
      f("burst", "Burst", "text", { help: "Burst size in bytes (default 15k)" }),
      f("exceed", "Exceed Action", "select", {
        options: ["continue", "drop", "ok", "reclassify", "pipe"],
        help: "Action for packets exceeding the limiter (default drop)",
      }),
      f("not-exceed", "Not-Exceed Action", "select", {
        options: ["continue", "drop", "ok", "reclassify", "pipe"],
        help: "Action for packets not exceeding the limiter (default ok)",
      }),
      f("mtu", "MTU", "number", { help: "MTU size in bytes (256-65535)" }),
      f("priority", "Priority", "number", { help: "Rule evaluation priority (0-20)" }),
    ],
  },
  "priority-queue": {
    label: "Priority Queue",
    description: "Priority queuing based policy",
    policyFields: [],
    hasClasses: true,
    hasDefault: true,
    classIdHelp: "Priority / class handle (1-7)",
    classFields: [...CODEL_FIELDS, f("queue-limit", "Queue Limit", "number"), QUEUE_TYPE("drop-tail")],
  },
  "round-robin": {
    label: "Round Robin",
    description: "Deficit Round Robin Scheduler",
    policyFields: [],
    hasClasses: true,
    hasDefault: true,
    classIdHelp: "Class identifier (1-4095)",
    classFields: [
      ...CODEL_FIELDS,
      f("quantum", "Quantum", "number", { help: "Packet scheduling quantum (bytes)" }),
      f("queue-limit", "Queue Limit", "number"),
      QUEUE_TYPE("fair-queue"),
    ],
  },
  shaper: {
    label: "Shaper",
    description: "Traffic shaping (Hierarchy Token Bucket)",
    policyFields: [bandwidth("bandwidth", "Bandwidth (or 'auto')")],
    hasClasses: true,
    hasDefault: true,
    classIdHelp: "Class identifier (2-4095)",
    classFields: [
      bandwidth("bandwidth", "Bandwidth (or 'auto')"),
      f("ceiling", "Ceiling", "text", { help: "Bandwidth limit for this class (e.g. 80mbit, 80%)" }),
      f("priority", "Priority", "number", { help: "Excess-bandwidth priority (0-7)" }),
      f("burst", "Burst", "text", { help: "Burst size in bytes (default 15k)" }),
      f("set-dscp", "Set DSCP", "dscp", { help: "Rewrite DSCP (name or 0-63)" }),
      f("average-packet", "Average Packet", "number", { help: "Average packet size, bytes (default 1024)" }),
      ...CODEL_FIELDS,
      f("mark-probability", "Mark Probability", "number", { help: "RED mark probability 1/N (default 10)" }),
      f("maximum-threshold", "Maximum Threshold", "number", { help: "RED max threshold, packets (default 18)" }),
      f("minimum-threshold", "Minimum Threshold", "number", { help: "RED min threshold, packets" }),
      f("queue-limit", "Queue Limit", "number"),
      QUEUE_TYPE("fq-codel"),
    ],
  },
  "shaper-hfsc": {
    label: "Shaper HFSC",
    description: "Hierarchical Fair Service Curve",
    policyFields: [bandwidth("bandwidth", "Bandwidth (or 'auto')")],
    hasClasses: true,
    hasDefault: true,
    classIdHelp: "Class identifier (1-4095)",
    classFields: [
      ...curve("linkshare", "Linkshare"),
      ...curve("realtime", "Realtime"),
      ...curve("upperlimit", "Upperlimit"),
    ],
  },
};

export const POLICY_TYPE_ORDER = [
  "shaper",
  "shaper-hfsc",
  "cake",
  "fq-codel",
  "fair-queue",
  "drop-tail",
  "limiter",
  "priority-queue",
  "round-robin",
  "rate-control",
  "random-detect",
  "network-emulator",
];

export const PRECEDENCE_FIELDS: FieldDef[] = [
  f("minimum-threshold", "Minimum Threshold", "number", { help: "Packets" }),
  f("maximum-threshold", "Maximum Threshold", "number", { help: "Packets (default 18)" }),
  f("average-packet", "Average Packet", "number", { help: "Bytes (default 1024)" }),
  f("mark-probability", "Mark Probability", "number", { help: "1/N (default 10)" }),
  f("queue-limit", "Queue Limit", "number", { help: "Packets" }),
];

// Shared match-rule field groups --------------------------------------------

export interface MatchGroupDef {
  id: string;
  label: string;
  fields: FieldDef[];
  flags?: { key: string; label: string }[];
}

function ipMatchGroup(proto: "ip" | "ipv6", label: string): MatchGroupDef {
  const addrKind: FieldKind = "text";
  return {
    id: proto,
    label,
    fields: [
      f(`${proto}/source/address`, "Source Address", addrKind, {
        help: proto === "ip" ? "IPv4 address or prefix" : "IPv6 address/prefix",
      }),
      f(`${proto}/source/port`, "Source Port", "number"),
      f(`${proto}/destination/address`, "Destination Address", addrKind),
      f(`${proto}/destination/port`, "Destination Port", "number"),
      f(`${proto}/protocol`, "Protocol", "text", { help: "Protocol name or number" }),
      f(`${proto}/dscp`, "DSCP", "dscp", { help: "Name or 0-63" }),
      f(`${proto}/max-length`, "Max Length", "number", { help: "Maximum packet length" }),
    ],
    flags: [
      { key: `${proto}/tcp/ack`, label: "TCP ACK" },
      { key: `${proto}/tcp/syn`, label: "TCP SYN" },
    ],
  };
}

export const MATCH_GROUPS: MatchGroupDef[] = [
  {
    id: "general",
    label: "General",
    fields: [
      f("description", "Description", "text"),
      f("interface", "Interface", "text", { help: "Interface name" }),
      f("mark", "Firewall Mark", "number", { help: "FW mark to match" }),
      f("vif", "VLAN ID", "number", { help: "VLAN tag (0-4095)" }),
    ],
  },
  {
    id: "ether",
    label: "Ethernet",
    fields: [
      f("ether/source", "Source MAC", "text", { placeholder: "aa:bb:cc:dd:ee:ff" }),
      f("ether/destination", "Destination MAC", "text", { placeholder: "aa:bb:cc:dd:ee:ff" }),
      f("ether/protocol", "Protocol", "text", { help: "Ethernet protocol name or number" }),
    ],
  },
  ipMatchGroup("ip", "IPv4"),
  ipMatchGroup("ipv6", "IPv6"),
];
