import type { SearchEntityKind, SearchResult } from "./types";
import { englishSearchI18n, type SearchI18n, type SearchIndexKey } from "./i18n";

/** Message key of the display label for each kind */
const KIND_LABEL_KEYS: Record<SearchEntityKind, SearchIndexKey> = {
  page: "kinds.page",
  section: "kinds.section",
  interface: "kinds.interface",
  "dhcp-subnet": "kinds.dhcpSubnet",
  "dhcp-range": "kinds.dhcpRange",
  "dhcp-static": "kinds.dhcpStatic",
  "wireguard-peer": "kinds.wireguardPeer",
  "firewall-rule": "kinds.firewallRule",
  "firewall-chain": "kinds.firewallChain",
  "firewall-group": "kinds.firewallGroup",
  "firewall-zone": "kinds.firewallZone",
  "bridge-chain": "kinds.bridgeChain",
  "bgp-neighbor": "kinds.bgpNeighbor",
  "bgp-peer-group": "kinds.bgpPeerGroup",
  "ospf-interface": "kinds.ospfInterface",
  "vrf-instance": "kinds.vrfInstance",
  "vrf-tab": "kinds.vrfTab",
  "nat-source": "kinds.natSource",
  "nat-destination": "kinds.natDestination",
  "nat-static": "kinds.natStatic",
  "nat-cgnat": "kinds.natCgnat",
  "host-mapping": "kinds.hostMapping",
  "system-user": "kinds.systemUser",
  "ssh-key": "kinds.sshKey",
  container: "kinds.container",
  "container-registry": "kinds.containerRegistry",
  "container-network": "kinds.containerNetwork",
  "haproxy-backend": "kinds.haproxyBackend",
  "haproxy-service": "kinds.haproxyService",
  "haproxy-server": "kinds.haproxyServer",
  "haproxy-rule": "kinds.haproxyRule",
  "pki-certificate": "kinds.pkiCertificate",
  "pki-dh": "kinds.pkiDh",
  "config-entity": "kinds.configEntity",
  "ui-field": "kinds.uiField",
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
export function humanizeKind(kind: string, i18n: SearchI18n = englishSearchI18n): string {
  const key = KIND_LABEL_KEYS[kind as SearchEntityKind];
  if (key) return i18n.t(key);
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
export function getResultTypeLabel(result: SearchResult, i18n: SearchI18n = englishSearchI18n): string {
  if (result.typeLabel) return result.typeLabel;

  const fromPath = typeLabelFromPath(result.subcategory);
  if (result.kind === "config-entity" || result.kind === "section") {
    if (fromPath) return fromPath;
    return i18n.t("kinds.configuration");
  }

  return humanizeKind(result.kind, i18n);
}
