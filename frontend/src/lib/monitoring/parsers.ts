/**
 * Monitoring Output Parsers
 *
 * Parse raw SSH output from VyOS monitoring commands into structured data.
 * All parsers are line-by-line and return null for unrecognised lines.
 */

// Strip ANSI/VT100 escape sequences (color codes, cursor movement, etc.)
// that vbash and some VyOS commands inject when running in interactive mode.
const ANSI_RE = /\x1b(?:[@-Z\\-_]|\[[0-9;]*[ -/]*[@-~])/g;

function clean(line: string): string {
  return line.replace(ANSI_RE, "").replace(/\r/g, "").trim();
}

// ============================================================================
// Traffic (tcpdump) Parser
// ============================================================================

export interface TrafficEntry {
  id: number;
  timestamp: string;
  networkProto: "IP" | "IP6" | "ARP" | string;
  proto: string; // TCP, UDP, ICMP, ICMPv6, ARP, other
  srcIp: string;
  srcPort: string;
  dstIp: string;
  dstPort: string;
  flags: string;
  length: string;
  info: string;
  raw: string;
}

// Well-known service names that tcpdump uses instead of port numbers
const KNOWN_SERVICES = new Set([
  "http", "https", "ftp", "ftps", "ssh", "telnet", "smtp", "smtps",
  "pop3", "pop3s", "imap", "imaps", "dns", "domain", "ntp", "snmp",
  "ldap", "ldaps", "bgp", "ospf", "rdp", "mysql", "postgres", "redis",
  "memcache", "syslog", "netbios", "smb", "vnc", "ipp", "dhcp",
  "dhcpv6", "bootpc", "bootps", "sunrpc", "rpcbind", "netstat",
]);

// IPv4 complete address: exactly 4 numeric octets
const IPV4_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

function splitIpPort(addr: string): { ip: string; port: string } {
  const lastDot = addr.lastIndexOf(".");
  if (lastDot === -1) return { ip: addr, port: "" };

  const potentialPort = addr.slice(lastDot + 1);
  const potentialIp  = addr.slice(0, lastDot);

  if (!potentialIp.length) return { ip: addr, port: "" };

  const isValidPort =
    /^\d{1,5}$/.test(potentialPort) ||
    KNOWN_SERVICES.has(potentialPort.toLowerCase());

  if (!isValidPort) return { ip: addr, port: "" };

  // IPv6 addresses contain colons; the port is appended with a trailing dot.
  // e.g. "::1.443" or "2001:db8::1.https"
  if (potentialIp.includes(":")) {
    return { ip: potentialIp, port: potentialPort };
  }

  // IPv4+port: the IP part must be a COMPLETE 4-octet address.
  // e.g. "192.168.1.1.80"  → ip="192.168.1.1"  port="80"  ✓
  //      "192.168.99.110"  → potentialIp="192.168.99" (3 octets) → no split ✓
  if (IPV4_RE.test(potentialIp)) {
    return { ip: potentialIp, port: potentialPort };
  }

  // Hostname: only split when the last label of potentialIp is non-numeric
  // (i.e. it really is a TLD/label, not an IP octet that got left behind).
  // e.g. "google.com.443"       → last label "com"  → non-numeric → split ✓
  //      "lcmiaa-aa-in-f14.1e100.net.443" → last label "net" → split ✓
  //      "192.168.1"  (partial) → last label "1"    → numeric   → no split ✓
  const lastLabel = potentialIp.slice(potentialIp.lastIndexOf(".") + 1);
  if (!/^\d+$/.test(lastLabel)) {
    return { ip: potentialIp, port: potentialPort };
  }

  // Looks like a partial/bare IP with no port — return the whole thing as-is.
  return { ip: addr, port: "" };
}

function detectProto(netProto: string, info: string): string {
  if (/^Flags\s*\[/.test(info)) return "TCP";
  if (/^UDP/.test(info)) return "UDP";
  if (/^ICMP6/.test(info)) return "ICMPv6";
  if (/^ICMP/.test(info)) return "ICMP";
  if (netProto === "ARP") return "ARP";
  const firstWord = info.split(/[\s,]/)[0]?.toUpperCase();
  if (firstWord && ["TCP", "UDP", "ICMP"].includes(firstWord)) return firstWord;
  return netProto || "other";
}

// Handles standard tcpdump format and `any`-interface format:
//   "HH:MM:SS.µs IP src > dst: ..."          (single interface)
//   "HH:MM:SS.µs eth0  IP src > dst: ..."    (any interface, iface column)
//   "HH:MM:SS.µs In eth0 IP src > dst: ..."  (any interface with direction)
// The {0,2} optional-prefix group captures 0-2 non-proto tokens before IP/IP6/ARP.
const TCPDUMP_RE =
  /^(\d{1,2}:\d{2}:\d{2}[.,]\d+)\s+(?:(?!IP6?\b|ARP\b)\S+\s+){0,2}(IP6?|ARP)\s+(.*)/;
const IP_TRAFFIC_RE = /^(\S+)\s+>\s+(\S+):\s*(.*)/;
const FLAGS_RE = /Flags\s*\[([^\]]*)\]/;
const LENGTH_RE = /length\s+(\d+)/;

export function parseTrafficLine(line: string, id: number): TrafficEntry | null {
  const trimmed = clean(line);
  if (!trimmed) return null;

  const m = trimmed.match(TCPDUMP_RE);
  if (!m) return null;

  const [, timestamp, netProto, rest] = m;

  // Skip tcpdump header lines
  if (
    rest.startsWith("listening on") ||
    rest.startsWith("tcpdump:") ||
    rest.startsWith("verbose") ||
    rest.startsWith("capture size")
  ) {
    return null;
  }

  let srcIp = "", srcPort = "", dstIp = "", dstPort = "", info = "";

  if (netProto === "ARP") {
    info = rest;
  } else {
    const tm = rest.match(IP_TRAFFIC_RE);
    if (!tm) return null;
    const [, srcAddr, dstAddr, infoStr] = tm;
    const src = splitIpPort(srcAddr);
    const dst = splitIpPort(dstAddr);
    srcIp = src.ip;
    srcPort = src.port;
    dstIp = dst.ip;
    dstPort = dst.port;
    info = infoStr;
  }

  const proto = detectProto(netProto, info);
  const flagsM = info.match(FLAGS_RE);
  const lengthM = info.match(LENGTH_RE);

  return {
    id,
    timestamp,
    networkProto: netProto,
    proto,
    srcIp,
    srcPort,
    dstIp,
    dstPort,
    flags: flagsM ? flagsM[1] : "",
    length: lengthM ? lengthM[1] : "",
    info,
    raw: trimmed,
  };
}

// ============================================================================
// Log Parser (syslog)
// ============================================================================

export type LogSeverity =
  | "emergency" | "alert" | "critical" | "error"
  | "warning" | "notice" | "info" | "debug" | "unknown";

export interface LogEntry {
  id: number;
  timestamp: string;
  hostname: string;
  severity: LogSeverity;
  process: string;
  pid: string;
  message: string;
  raw: string;
}

function detectSeverity(facilityLevel: string, message: string): LogSeverity {
  const level = facilityLevel.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, LogSeverity> = {
    emerg: "emergency", emergency: "emergency",
    alert: "alert",
    crit: "critical", critical: "critical",
    err: "error", error: "error",
    warn: "warning", warning: "warning",
    notice: "notice",
    info: "info",
    debug: "debug",
  };
  if (map[level]) return map[level];

  const lc = message.toLowerCase();
  if (/\berror\b|\bfail(ed|ure)?\b/.test(lc)) return "error";
  if (/\bwarn(ing)?\b/.test(lc)) return "warning";
  if (/\bdebug\b/.test(lc)) return "debug";

  return "info";
}

// "Jan 15 14:22:19 hostname [facility.level] process[pid]: message"
// "Jan 15 14:22:19 hostname process[pid]: message"
// "Jun 14 15:47:56 process[pid]: message"  (journald w/o hostname — `show log openvpn|vpn|l2tp`)
//
// The hostname group is optional AND lazy so the no-hostname form is preferred:
// this keeps messages that themselves contain a colon (e.g. "net_addr_v4_add: 10.8.0.1")
// from being mis-split into hostname/process. The process token excludes "[" so a
// "process[pid]:" prefix can never be swallowed as a hostname.
const LOG_RE =
  /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(?:(\S+)\s+)??(?:(\w+\.\w+)\s+)?([\w.\-/@]+?)(?:\[(\d+)\])?:\s*(.*)/;

export function parseLogLine(line: string, id: number): LogEntry | null {
  const trimmed = clean(line);
  if (!trimmed) return null;

  const m = trimmed.match(LOG_RE);
  if (!m) return null;

  const [, timestamp, hostname, facilityLevel = "", process, pid = "", message] = m;

  return {
    id,
    timestamp,
    hostname,
    severity: detectSeverity(facilityLevel, message),
    process,
    pid,
    message,
    raw: trimmed,
  };
}

// ============================================================================
// Conntrack Parser
// ============================================================================

export type ConntrackEvent = "NEW" | "UPDATE" | "DESTROY" | "unknown";

export interface ConntrackEntry {
  id: number;
  timestamp: string;
  event: ConntrackEvent;
  proto: string;
  state: string;
  srcIp: string;
  srcPort: string;
  dstIp: string;
  dstPort: string;
  replySrcIp: string;
  replySrcPort: string;
  replyDstIp: string;
  replyDstPort: string;
  raw: string;
}

// [NEW] tcp  6 120 ESTABLISHED src=X dst=Y sport=A dport=B ... src=X dst=Y sport=A dport=B
const CONNTRACK_RE =
  /\[(NEW|UPDATE|DESTROY)\]\s+(\w+)\s+\d+(?:\s+\d+)?(?:\s+([A-Z_]+))?\s+src=(\S+)\s+dst=(\S+)\s+sport=(\d+)\s+dport=(\d+)(?:.*?src=(\S+)\s+dst=(\S+)\s+sport=(\d+)\s+dport=(\d+))?/;

export function parseConntrackLine(line: string, id: number): ConntrackEntry | null {
  const trimmed = clean(line);
  if (!trimmed) return null;

  const m = trimmed.match(CONNTRACK_RE);
  if (!m) return null;

  const [
    ,
    event, proto, state = "",
    srcIp, dstIp, srcPort, dstPort,
    replySrcIp = "", replyDstIp = "", replySrcPort = "", replyDstPort = "",
  ] = m;

  return {
    id,
    timestamp: new Date().toLocaleTimeString(),
    event: event as ConntrackEvent,
    proto: proto.toUpperCase(),
    state,
    srcIp,
    srcPort,
    dstIp,
    dstPort,
    replySrcIp,
    replySrcPort,
    replyDstIp,
    replyDstPort,
    raw: trimmed,
  };
}

// ============================================================================
// Shared helpers
// ============================================================================

/** Parse all lines from a batch of WebSocket output chunks. */
export function parseChunks<T>(
  chunks: string[],
  parser: (line: string, id: number) => T | null,
  startId: number
): T[] {
  const entries: T[] = [];
  let id = startId;
  for (const chunk of chunks) {
    for (const line of chunk.split("\n")) {
      const entry = parser(line, id++);
      if (entry) entries.push(entry);
    }
  }
  return entries;
}
