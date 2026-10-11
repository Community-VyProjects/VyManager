/**
 * Suricata config model.
 *
 * VyOS only exposes interfaces, named address/port groups, and EVE logging.
 * Group names become Suricata variables (home-net -> $HOME_NET). The generated
 * capture config references $GENEVE_PORTS, $VXLAN_PORTS, and $TEREDO_PORTS, so
 * a setup that omits them will not start. Downloaded rules expect $HOME_NET
 * and $EXTERNAL_NET. This module keeps those facts out of the components.
 */

export interface SuricataMember {
  value: string;
  exclude: boolean;
}

export interface SuricataGroup {
  name: string;
  members: SuricataMember[];
  groups: SuricataMember[];
}

export interface SuricataLog {
  enabled: boolean;
  filename: string | null;
  filetype: string | null;
  types: string[];
  types_set: boolean;
}

export interface SuricataConfig {
  configured: boolean;
  interfaces: string[];
  address_groups: SuricataGroup[];
  port_groups: SuricataGroup[];
  log: SuricataLog;
}

export interface SuricataOp {
  op: string;
  value?: string;
}

export interface SuricataIssue {
  level: "block" | "warn";
  message: string;
}

export const EVE_FILETYPES = ["regular", "syslog"] as const;

export const EVE_TYPES = [
  "alert",
  "anomaly",
  "http",
  "dns",
  "tls",
  "files",
  "drop",
  "smtp",
  "dnp3",
  "ftp",
  "rdp",
  "nfs",
  "smb",
  "tftp",
  "ikev2",
  "dcerpc",
  "krb5",
  "snmp",
  "rfb",
  "sip",
  "dhcp",
  "ssh",
  "mqtt",
  "http2",
  "flow",
  "netflow",
] as const;

export const REQUIRED_PORT_GROUPS = ["geneve-ports", "vxlan-ports", "teredo-ports"] as const;

const INTERFACE_NAME =
  /^(?:(?:bond|br|dum|en|ersp|eth|gnv|ifb|ipoe|lan|l2tp|l2tpeth|macsec|peth|ppp|pppoe|pptp|sstp|sstpc|tun|veth|vpptap|vpptun|vti|vtun|vxlan|wg|wlan|wwan)[0-9]+(?:\.\d+)?|pod-[-_a-zA-Z0-9]{1,11}|lo)$/;

const GROUP_NAME = /^[a-z0-9-]+$/;

function portNumber(text: string): number | null {
  if (!/^[1-9]\d{0,4}$/.test(text)) return null;
  const number = Number(text);
  return number >= 1 && number <= 65535 ? number : null;
}

export const GROUP_PURPOSE: Record<string, string> = {
  "home-net": "Addresses you own. Rules call this $HOME_NET.",
  "external-net": "Everything that is not your network.",
  "http-servers": "Web servers. Defaults to your network.",
  "smtp-servers": "Mail servers. Defaults to your network.",
  "sql-servers": "Database servers. Defaults to your network.",
  "dns-servers": "DNS servers. Defaults to your network.",
  "telnet-servers": "Telnet servers. Defaults to your network.",
  "aim-servers": "Legacy messaging servers. Defaults to outside your network.",
  "dc-servers": "Domain controllers. Defaults to your network.",
  "dnp3-server": "DNP3 servers. Defaults to your network.",
  "dnp3-client": "DNP3 clients. Defaults to your network.",
  "modbus-client": "Modbus clients. Defaults to your network.",
  "modbus-server": "Modbus servers. Defaults to your network.",
  "enip-client": "EtherNet/IP clients. Defaults to your network.",
  "enip-server": "EtherNet/IP servers. Defaults to your network.",
  "http-ports": "Web ports.",
  "shellcode-ports": "Ports excluded from shellcode rules. Defaults to not port 80.",
  "oracle-ports": "Oracle listener.",
  "ssh-ports": "SSH.",
  "dnp3-ports": "DNP3.",
  "modbus-ports": "Modbus.",
  "file-data-ports": "Ports where file extraction runs.",
  "ftp-ports": "FTP.",
  "geneve-ports": "Required. The capture config references $GENEVE_PORTS.",
  "vxlan-ports": "Required. The capture config references $VXLAN_PORTS.",
  "teredo-ports": "Required. The capture config references $TEREDO_PORTS.",
};

export const EVE_TYPE_GROUPS: { title: string; types: { id: string; label: string }[] }[] = [
  {
    title: "Alerts",
    types: [
      { id: "alert", label: "Rule matches" },
      { id: "drop", label: "Dropped packets" },
      { id: "anomaly", label: "Invalid or truncated packets" },
      { id: "files", label: "Extracted files" },
    ],
  },
  {
    title: "Connections",
    types: [
      { id: "flow", label: "Both directions of a connection" },
      { id: "netflow", label: "One direction of a connection" },
    ],
  },
  {
    title: "Applications",
    types: [
      { id: "http", label: "HTTP" },
      { id: "dns", label: "DNS" },
      { id: "tls", label: "TLS" },
      { id: "smtp", label: "SMTP" },
      { id: "ftp", label: "FTP" },
      { id: "ssh", label: "SSH" },
      { id: "dhcp", label: "DHCP" },
      { id: "smb", label: "SMB" },
      { id: "nfs", label: "NFS" },
      { id: "rdp", label: "RDP" },
      { id: "sip", label: "SIP" },
      { id: "snmp", label: "SNMP" },
      { id: "tftp", label: "TFTP" },
      { id: "ikev2", label: "IKEv2" },
      { id: "krb5", label: "Kerberos" },
      { id: "mqtt", label: "MQTT" },
      { id: "http2", label: "HTTP/2" },
      { id: "dcerpc", label: "DCERPC" },
      { id: "dnp3", label: "DNP3" },
      { id: "rfb", label: "RFB" },
    ],
  },
];

function member(value: string, exclude = false): SuricataMember {
  return { value, exclude };
}

function group(
  name: string,
  members: SuricataMember[] = [],
  groups: SuricataMember[] = [],
): SuricataGroup {
  return { name, members, groups };
}

const HOME = group("home-net", [
  member("10.0.0.0/8"),
  member("172.16.0.0/12"),
  member("192.168.0.0/16"),
]);

function refHome(exclude = false): SuricataMember[] {
  return [member("home-net", exclude)];
}

const STANDARD_ADDRESS_GROUPS: SuricataGroup[] = [
  HOME,
  group("external-net", [], refHome(true)),
  group("http-servers", [], refHome()),
  group("smtp-servers", [], refHome()),
  group("sql-servers", [], refHome()),
  group("dns-servers", [], refHome()),
  group("telnet-servers", [], refHome()),
  group("aim-servers", [], [member("external-net")]),
  group("dc-servers", [], refHome()),
  group("dnp3-server", [], refHome()),
  group("dnp3-client", [], refHome()),
  group("modbus-client", [], refHome()),
  group("modbus-server", [], refHome()),
  group("enip-client", [], refHome()),
  group("enip-server", [], refHome()),
];

const STANDARD_PORT_GROUPS: SuricataGroup[] = [
  group("http-ports", [member("80")]),
  group("shellcode-ports", [member("80", true)]),
  group("oracle-ports", [member("1521")]),
  group("ssh-ports", [member("22")]),
  group("dnp3-ports", [member("20000")]),
  group("modbus-ports", [member("502")]),
  group("file-data-ports", [member("110"), member("143")], [member("http-ports")]),
  group("ftp-ports", [member("21")]),
  group("geneve-ports", [member("6081")]),
  group("vxlan-ports", [member("4789")]),
  group("teredo-ports", [member("3544")]),
];

export function emptyConfig(): SuricataConfig {
  return {
    configured: false,
    interfaces: [],
    address_groups: [],
    port_groups: [],
    log: { enabled: false, filename: null, filetype: null, types: [], types_set: false },
  };
}

export function cloneConfig(config: SuricataConfig): SuricataConfig {
  return structuredClone(config);
}

export function variableName(groupName: string): string {
  return groupName.replace(/-/g, "_").toUpperCase();
}

export function slugGroupName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isSuricataInterfaceName(name: string): boolean {
  return INTERFACE_NAME.test(name);
}

export function isGroupName(name: string): boolean {
  return GROUP_NAME.test(name);
}

export function isAddress(value: string): boolean {
  if (!value || value.includes(",") || value.includes("%") || /\s/.test(value)) return false;
  if (value.includes(":")) return isIPv6(value);
  return isIPv4(value);
}

export function isPort(value: string): boolean {
  const parts = value.split("-");
  if (parts.length > 2) return false;
  const start = portNumber(parts[0]);
  if (start === null) return false;
  if (parts.length === 1) return true;
  const end = portNumber(parts[1]);
  return end !== null && start <= end;
}

function isIPv4(value: string): boolean {
  const [addr, prefix, extra] = value.split("/");
  if (extra !== undefined || !addr) return false;
  const parts = addr.split(".");
  if (parts.length !== 4) return false;
  if (!parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255 && !(part.length > 1 && part.startsWith("0")))) {
    return false;
  }
  const octets = parts.map(Number);
  if (prefix === undefined) return true;
  if (!/^\d{1,2}$/.test(prefix) || (prefix.length > 1 && prefix.startsWith("0"))) return false;
  const bits = Number(prefix);
  if (bits > 32) return false;
  const ip = octets.reduce((acc, octet) => ((acc << 8) + octet) >>> 0, 0);
  const hostBits = 32 - bits;
  const hostMask = hostBits === 0 ? 0 : hostBits >= 32 ? 0xffffffff : (2 ** hostBits - 1) >>> 0;
  return (ip & hostMask) === 0;
}

function isIPv6(value: string): boolean {
  const [addr, prefix, extra] = value.split("/");
  if (extra !== undefined || !addr || !addr.includes(":")) return false;
  if (prefix !== undefined && (!/^\d{1,3}$/.test(prefix) || Number(prefix) > 128)) return false;
  // Host-bit checks for IPv6 prefixes are left to the device. Format only.
  const sides = addr.split("::");
  if (sides.length > 2) return false;
  const groups = sides.flatMap((side) => (side === "" ? [] : side.split(":")));
  if (groups.some((group) => !/^[0-9a-fA-F]{1,4}$/.test(group))) return false;
  const compressed = addr.includes("::");
  return compressed ? groups.length < 8 : groups.length === 8;
}

export function memberToken(item: SuricataMember): string {
  return item.exclude ? `!${item.value}` : item.value;
}

export function previewValue(item: SuricataMember, nested: boolean): string {
  if (!nested) return memberToken(item);
  const variable = `$${variableName(item.value)}`;
  return item.exclude ? `!${variable}` : variable;
}

export function groupPreview(item: SuricataGroup): string {
  const parts = [
    ...item.members.map((member) => previewValue(member, false)),
    ...item.groups.map((member) => previewValue(member, true)),
  ];
  return `$${variableName(item.name)} = [${parts.join(", ")}]`;
}

function byName(groups: SuricataGroup[]): Map<string, SuricataGroup> {
  return new Map(groups.map((group) => [group.name, group]));
}

export function findCycles(groups: SuricataGroup[]): string | null {
  const source = byName(groups);
  const permanent = new Set<string>();
  const temporary = new Set<string>();

  function visit(name: string): string | null {
    if (permanent.has(name)) return null;
    if (temporary.has(name)) return `Group "${name}" refers to itself through other groups`;
    temporary.add(name);
    for (const ref of source.get(name)?.groups ?? []) {
      if (!source.has(ref.value)) continue;
      const cycle = visit(ref.value);
      if (cycle) return cycle;
    }
    temporary.delete(name);
    permanent.add(name);
    return null;
  }

  for (const name of source.keys()) {
    const cycle = visit(name);
    if (cycle) return cycle;
  }
  return null;
}

export function referrers(groups: SuricataGroup[], name: string): string[] {
  return groups
    .filter((group) => group.name !== name && group.groups.some((ref) => ref.value === name))
    .map((group) => group.name);
}

function missingRefs(groups: SuricataGroup[]): string[] {
  const names = new Set(groups.map((group) => group.name));
  const missing = new Set<string>();
  for (const group of groups) {
    for (const ref of group.groups) {
      if (!names.has(ref.value)) missing.add(ref.value);
    }
  }
  return [...missing];
}

export function reviewConfig(config: SuricataConfig): SuricataIssue[] {
  const issues: SuricataIssue[] = [];
  if (config.interfaces.length === 0) {
    issues.push({ level: "block", message: "Choose at least one interface. The device will not save Suricata without one." });
  }
  for (const name of config.interfaces) {
    if (!isSuricataInterfaceName(name)) {
      issues.push({ level: "block", message: `${name} is not an interface Suricata can watch.` });
    }
  }
  if (config.address_groups.length === 0) {
    issues.push({ level: "block", message: "Add at least one address group. The device will not save Suricata without one." });
  }
  if (config.port_groups.length === 0) {
    issues.push({ level: "block", message: "Add at least one port group. The device will not save Suricata without one." });
  }

  for (const [label, groups] of [
    ["Address", config.address_groups],
    ["Port", config.port_groups],
  ] as const) {
    const seen = new Set<string>();
    for (const group of groups) {
      if (!isGroupName(group.name)) {
        issues.push({ level: "block", message: `${label} group "${group.name}" must use lowercase letters, digits, and hyphens.` });
      }
      if (seen.has(group.name)) {
        issues.push({ level: "block", message: `${label} group "${group.name}" is listed twice.` });
      }
      seen.add(group.name);
      const check = label === "Address" ? isAddress : isPort;
      const noun = label === "Address" ? "address" : "port";
      for (const item of group.members) {
        if (!check(item.value)) {
          issues.push({ level: "block", message: `${group.name} has an invalid ${noun}: ${item.value}` });
        }
      }
      for (const ref of group.groups) {
        if (!isGroupName(ref.value)) {
          issues.push({ level: "block", message: `${group.name} refers to an invalid group: ${ref.value}` });
        }
      }
      if (group.members.length === 0 && group.groups.length === 0) {
        issues.push({ level: "warn", message: `${group.name} is empty, so rules using $${variableName(group.name)} will not match.` });
      }
    }
    const cycle = findCycles(groups);
    if (cycle) issues.push({ level: "block", message: cycle });
    for (const name of missingRefs(groups)) {
      issues.push({ level: "block", message: `A group refers to ${name}, which does not exist.` });
    }
  }

  if (!config.address_groups.some((group) => group.name === "home-net")) {
    issues.push({ level: "warn", message: "Detection rules look for $HOME_NET. Add a home-net group or those rules will not match your network." });
  }
  if (!config.address_groups.some((group) => group.name === "external-net")) {
    issues.push({ level: "warn", message: "Detection rules look for $EXTERNAL_NET. Add an external-net group or outside-network rules will not match." });
  }
  const missingPorts = REQUIRED_PORT_GROUPS.filter(
    (name) => !config.port_groups.some((group) => group.name === name),
  );
  if (missingPorts.length > 0) {
    const variables = missingPorts.map((name) => `$${variableName(name)}`).join(", ");
    issues.push({
      level: "warn",
      message: `Suricata will fail to start without ${variables}. The capture config on this device references them.`,
    });
  }

  if (config.log.enabled) {
    if (config.log.filetype && !EVE_FILETYPES.includes(config.log.filetype as (typeof EVE_FILETYPES)[number])) {
      issues.push({ level: "block", message: "Log destination must be a file or syslog." });
    }
    if (config.log.filename && (config.log.filename.includes(",") || /[\x00-\x1f]/.test(config.log.filename))) {
      issues.push({ level: "block", message: "Log file name cannot contain a comma or a line break." });
    }
    const selected = effectiveTypes(config.log);
    for (const eventType of selected) {
      if (!EVE_TYPES.includes(eventType as (typeof EVE_TYPES)[number])) {
        issues.push({ level: "block", message: `${eventType} is not a log type this device accepts.` });
      }
    }
    if (selected.length === 0) {
      issues.push({ level: "block", message: "Choose at least one log type, or turn logging off." });
    }
  }

  return issues;
}

export function blockers(config: SuricataConfig): string[] {
  return reviewConfig(config)
    .filter((issue) => issue.level === "block")
    .map((issue) => issue.message);
}

function effectiveTypes(log: SuricataLog): string[] {
  if (!log.enabled) return [];
  if (!log.types_set && log.types.length === 0) return ["alert"];
  return [...log.types];
}

export function displayedLogTypes(log: SuricataLog): string[] {
  return effectiveTypes(log);
}

export function withLogTypes(log: SuricataLog, types: string[]): SuricataLog {
  return { ...log, types: [...types], types_set: true };
}

function tokenSet(items: SuricataMember[]): Set<string> {
  return new Set(items.map(memberToken));
}

function diffTokens(
  ops: SuricataOp[],
  setOp: string,
  deleteOp: string,
  name: string,
  before: SuricataMember[],
  after: SuricataMember[],
) {
  const oldTokens = tokenSet(before);
  const nextTokens = tokenSet(after);
  for (const token of oldTokens) {
    if (!nextTokens.has(token)) ops.push({ op: deleteOp, value: `${name},${token}` });
  }
  for (const token of nextTokens) {
    if (!oldTokens.has(token)) ops.push({ op: setOp, value: `${name},${token}` });
  }
}

function diffGroups(
  ops: SuricataOp[],
  kind: "address" | "port",
  before: SuricataGroup[],
  after: SuricataGroup[],
) {
  const setGroup = kind === "address" ? "set_address_group" : "set_port_group";
  const deleteGroup = kind === "address" ? "delete_address_group" : "delete_port_group";
  const setMember = kind === "address" ? "set_address" : "set_port";
  const deleteMember = kind === "address" ? "delete_address" : "delete_port";
  const setRef = kind === "address" ? "set_address_group_ref" : "set_port_group_ref";
  const deleteRef = kind === "address" ? "delete_address_group_ref" : "delete_port_group_ref";
  const oldGroups = byName(before);
  const nextGroups = byName(after);

  for (const name of oldGroups.keys()) {
    if (!nextGroups.has(name)) ops.push({ op: deleteGroup, value: name });
  }
  for (const [name, next] of nextGroups) {
    const previous = oldGroups.get(name);
    if (!previous) {
      if (next.members.length === 0 && next.groups.length === 0) {
        ops.push({ op: setGroup, value: name });
        continue;
      }
      diffTokens(ops, setMember, deleteMember, name, [], next.members);
      diffTokens(ops, setRef, deleteRef, name, [], next.groups);
      continue;
    }
    diffTokens(ops, setMember, deleteMember, name, previous.members, next.members);
    diffTokens(ops, setRef, deleteRef, name, previous.groups, next.groups);
  }
}

export function buildOps(original: SuricataConfig, updated: SuricataConfig): SuricataOp[] {
  const ops: SuricataOp[] = [];
  const oldIfaces = new Set(original.interfaces);
  const nextIfaces = new Set(updated.interfaces);
  for (const name of oldIfaces) {
    if (!nextIfaces.has(name)) ops.push({ op: "delete_interface", value: name });
  }
  for (const name of nextIfaces) {
    if (!oldIfaces.has(name)) ops.push({ op: "set_interface", value: name });
  }
  diffGroups(ops, "address", original.address_groups, updated.address_groups);
  diffGroups(ops, "port", original.port_groups, updated.port_groups);

  const before = original.log;
  const after = updated.log;
  if (before.enabled && !after.enabled) {
    ops.push({ op: "delete_log" });
  } else if (after.enabled) {
    const filename = after.filename?.trim() || null;
    const filetype = after.filetype || null;
    if (!before.enabled) {
      ops.push({ op: "set_log_eve_filename", value: filename || "eve.json" });
      ops.push({ op: "set_log_eve_filetype", value: filetype || "regular" });
    } else {
      if (filename && filename !== before.filename) {
        ops.push({ op: "set_log_eve_filename", value: filename });
      } else if (!filename && before.filename && before.filename !== "eve.json") {
        ops.push({ op: "set_log_eve_filename", value: "eve.json" });
      }
      if (filetype && filetype !== before.filetype) {
        ops.push({ op: "set_log_eve_filetype", value: filetype });
      } else if (!filetype && before.filetype && before.filetype !== "regular") {
        ops.push({ op: "set_log_eve_filetype", value: "regular" });
      }
    }
    const oldTypes = new Set(before.types_set ? before.types : []);
    const nextTypes = effectiveTypes(after);
    const nextSet = new Set(nextTypes);
    const implicitOnly = !before.types_set && nextTypes.length === 1 && nextTypes[0] === "alert" && before.enabled;
    if (!implicitOnly) {
      for (const eventType of oldTypes) {
        if (!nextSet.has(eventType)) ops.push({ op: "delete_log_eve_type", value: eventType });
      }
      for (const eventType of nextSet) {
        if (!oldTypes.has(eventType)) ops.push({ op: "set_log_eve_type", value: eventType });
      }
    }
  }
  return ops;
}

export function configsEqual(left: SuricataConfig, right: SuricataConfig): boolean {
  return JSON.stringify(normalizeForCompare(left)) === JSON.stringify(normalizeForCompare(right));
}

function normalizeForCompare(config: SuricataConfig): SuricataConfig {
  const sortGroups = (groups: SuricataGroup[]) =>
    [...groups]
      .map((group) => ({
        ...group,
        members: [...group.members].sort((a, b) => memberToken(a).localeCompare(memberToken(b))),
        groups: [...group.groups].sort((a, b) => memberToken(a).localeCompare(memberToken(b))),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  return {
    configured: config.configured,
    interfaces: [...config.interfaces].sort(),
    address_groups: sortGroups(config.address_groups),
    port_groups: sortGroups(config.port_groups),
    log: comparableLog(config.log),
  };
}

function comparableLog(log: SuricataLog): SuricataLog {
  if (!log.enabled) {
    return { enabled: false, filename: null, filetype: null, types: [], types_set: false };
  }
  const filename = log.filename?.trim() || null;
  const filetype = log.filetype || null;
  const types = !log.types_set && log.types.length === 0 ? ["alert"] : [...log.types].sort();
  return {
    enabled: true,
    filename: !filename || filename === "eve.json" ? "eve.json" : filename,
    filetype: !filetype || filetype === "regular" ? "regular" : filetype,
    types,
    types_set: true,
  };
}

export function buildSetupConfig(input: {
  interfaces: string[];
  homeNet: string[];
  includeStandardVariables: boolean;
  logAlerts: boolean;
}): SuricataConfig {
  const home = group(
    "home-net",
    input.homeNet.map((value) => member(value)),
  );
  const addressGroups = input.includeStandardVariables
    ? STANDARD_ADDRESS_GROUPS.map((item) => (item.name === "home-net" ? home : structuredClone(item)))
    : [home, group("external-net", [], refHome(true))];
  const portGroups = input.includeStandardVariables
    ? STANDARD_PORT_GROUPS.map((item) => structuredClone(item))
    : STANDARD_PORT_GROUPS.filter((item) =>
        REQUIRED_PORT_GROUPS.includes(item.name as (typeof REQUIRED_PORT_GROUPS)[number]),
      ).map((item) => structuredClone(item));
  return {
    configured: true,
    interfaces: [...input.interfaces],
    address_groups: addressGroups,
    port_groups: portGroups,
    log: input.logAlerts
      ? { enabled: true, filename: "eve.json", filetype: "regular", types: ["alert"], types_set: true }
      : { enabled: false, filename: null, filetype: null, types: [], types_set: false },
  };
}

export function mergeMissingStandardGroups(config: SuricataConfig): SuricataConfig {
  const next = cloneConfig(config);
  const addressNames = new Set(next.address_groups.map((group) => group.name));
  const portNames = new Set(next.port_groups.map((group) => group.name));
  for (const group of STANDARD_ADDRESS_GROUPS) {
    if (!addressNames.has(group.name)) next.address_groups.push(structuredClone(group));
  }
  for (const group of STANDARD_PORT_GROUPS) {
    if (!portNames.has(group.name)) next.port_groups.push(structuredClone(group));
  }
  return next;
}

export function editorDraft(config: SuricataConfig): SuricataConfig {
  return cloneConfig(config);
}

export function setLoggingEnabled(config: SuricataConfig, enabled: boolean): SuricataConfig {
  return { ...config, log: { ...config.log, enabled } };
}
