import type { ComponentType } from "react";

/** Entity kinds for filtering and display — distinct from nav "page" sections */
export type SearchEntityKind =
  | "page"
  | "section"
  | "interface"
  | "dhcp-subnet"
  | "dhcp-range"
  | "dhcp-static"
  | "wireguard-peer"
  | "firewall-rule"
  | "firewall-chain"
  | "firewall-group"
  | "firewall-zone"
  | "bridge-chain"
  | "bgp-neighbor"
  | "bgp-peer-group"
  | "ospf-interface"
  | "vrf-instance"
  | "vrf-tab"
  | "nat-source"
  | "nat-destination"
  | "nat-static"
  | "nat-cgnat"
  | "host-mapping"
  | "system-user"
  | "ssh-key"
  | "container"
  | "container-registry"
  | "container-network"
  | "haproxy-backend"
  | "haproxy-service"
  | "haproxy-server"
  | "haproxy-rule"
  | "pki-certificate"
  | "pki-dh"
  | "config-entity"
  | "ui-field";

export interface SearchResult {
  id: string;
  title: string;
  /** Short disambiguation line shown under title (e.g. "Conntrack · Table Sizes") */
  subtitle?: string;
  description: string;
  kind: SearchEntityKind;
  /** Human-readable type for UI (e.g. "VRRP Group", "Pre-Shared Key") — overrides kind-derived labels */
  typeLabel?: string;
  /** Top-level product area: Firewall, Network, Routing, … */
  feature: string;
  /** Legacy / filter alias — usually same as feature or parent nav group */
  category: string;
  /** Narrow context path for ambiguous labels */
  subcategory?: string;
  keywords: string[];
  href?: string;
  data?: unknown;
  icon?: ComponentType<{ className?: string }>;
  starred?: boolean;
}

export interface SearchFilters {
  features: string[];
  kinds: SearchEntityKind[];
}

export type SearchColumn = "title" | "context" | "kind" | "description";

export interface SearchQueryOptions {
  limit?: number;
  filters?: SearchFilters;
}

export interface ScoredSearchResult extends SearchResult {
  score: number;
}

export interface SearchIndexerContext {
  activeSession: boolean;
}

export interface SearchIndexer {
  id: string;
  index: () => Promise<SearchResult[]>;
}
