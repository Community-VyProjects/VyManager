import type { SearchEntityKind, SearchResult } from "./types";

/** Known kinds — anything else is derived automatically */
const KIND_LABEL_OVERRIDES: Partial<Record<SearchEntityKind, string>> = {
  page: "Page",
  section: "Section",
  interface: "Interface",
  "dhcp-subnet": "DHCP Subnet",
  "dhcp-range": "DHCP Range",
  "dhcp-static": "DHCP Static",
  "wireguard-peer": "WireGuard Peer",
  "firewall-rule": "Firewall Rule",
  "firewall-chain": "Custom Chain",
  "firewall-group": "Firewall Group",
  "firewall-zone": "Zone",
  "bridge-chain": "Bridge Chain",
  "bgp-neighbor": "BGP Neighbor",
  "bgp-peer-group": "BGP Peer Group",
  "ospf-interface": "OSPF Interface",
  "vrf-instance": "VRF Instance",
  "vrf-tab": "VRF Tab",
  "nat-source": "Source NAT",
  "nat-destination": "Destination NAT",
  "nat-static": "Static NAT",
  "nat-cgnat": "CGNAT",
  "host-mapping": "Host Mapping",
  "system-user": "System User",
  "ssh-key": "SSH Key",
  container: "Container",
  "container-registry": "Registry",
  "container-network": "Container Network",
  "haproxy-backend": "HAProxy Backend",
  "haproxy-service": "HAProxy Service",
  "haproxy-server": "HAProxy Server",
  "haproxy-rule": "HAProxy Rule",
  "pki-certificate": "Certificate",
  "pki-dh": "DH Parameters",
  "ui-field": "Setting",
};

export function humanizeToken(token: string): string {
  return token
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Turn `bgp-peer-group` or `pre_shared_keys` into readable text */
export function humanizeKind(kind: string): string {
  if (KIND_LABEL_OVERRIDES[kind as SearchEntityKind]) {
    return KIND_LABEL_OVERRIDES[kind as SearchEntityKind]!;
  }
  return kind
    .split("-")
    .map((part) => humanizeToken(part))
    .join(" ");
}

function singularize(segment: string): string {
  const lower = segment.toLowerCase();
  if (lower.endsWith("ies")) return segment.slice(0, -3) + "y";
  if (lower.endsWith("ses") || lower.endsWith("xes")) return segment.slice(0, -2);
  if (lower.endsWith("s") && !lower.endsWith("ss") && segment.length > 3) {
    return segment.slice(0, -1);
  }
  return segment;
}

/** Derive a type label from subcategory path (e.g. "… · Pre Shared Keys" → "Pre Shared Key") */
export function typeLabelFromPath(subcategory?: string): string | undefined {
  if (!subcategory) return undefined;
  const segments = subcategory.split("·").map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) return undefined;
  const last = segments[segments.length - 1];
  return singularize(humanizeToken(last));
}

/**
 * Display label for the "kind" column — works for every indexed item without maintaining a giant enum map.
 */
export function getResultTypeLabel(result: SearchResult): string {
  if (result.typeLabel) return result.typeLabel;

  const fromPath = typeLabelFromPath(result.subcategory);
  if (result.kind === "config-entity" || result.kind === "section") {
    if (fromPath) return fromPath;
    return "Configuration";
  }

  return KIND_LABEL_OVERRIDES[result.kind] ?? humanizeKind(result.kind);
}
