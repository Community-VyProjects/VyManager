/**
 * TypeScript types for Ethernet Interface API
 * Based on OpenAPI specification
 */

// Basic config types
export interface DHCPOptionsConfig {
  client_id?: string | null;
  host_name?: string | null;
  vendor_class_id?: string | null;
  no_default_route?: boolean | null;
  default_route_distance?: string | null;
}

export interface DHCPv6OptionsConfig {
  duid?: string | null;
  rapid_commit?: boolean | null;
  pd?: Record<string, unknown> | null;
}

export interface OffloadConfig {
  gro?: string | null;
  gso?: string | null;
  lro?: string | null;
  rps?: string | null;
  sg?: string | null;
  tso?: string | null;
}

export interface RingBufferConfig {
  rx?: string | null;
  tx?: string | null;
}

export interface IPConfig {
  adjust_mss?: string | null;
  arp_cache_timeout?: string | null;
  disable_arp_filter?: boolean | null;
  enable_arp_accept?: boolean | null;
  enable_arp_announce?: boolean | null;
  enable_arp_ignore?: boolean | null;
  enable_proxy_arp?: boolean | null;
  proxy_arp_pvlan?: boolean | null;
  source_validation?: string | null;
  enable_directed_broadcast?: boolean | null;
}

export interface IPv6Config {
  address?: string[] | null;
  adjust_mss?: string | null;
  disable_forwarding?: boolean | null;
  dup_addr_detect_transmits?: string | null;
}

export interface VIFConfig {
  vlan_id: string;
  addresses: string[];
  description?: string | null;
  mtu?: string | null;
  mac?: string | null;
  vrf?: string | null;
  disable?: boolean | null;
}

export interface VIFSConfig extends VIFConfig {
  vif_c?: VIFConfig[] | null;
}

export interface MirrorConfig {
  ingress?: string | null;
  egress?: string | null;
}

export interface EAPoLConfig {
  ca_cert_file?: string | null;
  cert_file?: string | null;
  key_file?: string | null;
}

export interface EVPNConfig {
  uplink?: boolean | null;
}

// Main Ethernet Interface type
export interface EthernetInterface {
  name: string;
  type: string;
  addresses: string[];
  description?: string | null;
  vrf?: string | null;
  mtu?: string | null;
  hw_id?: string | null;
  mac?: string | null;
  duplex?: string | null;
  speed?: string | null;
  disable?: boolean | null;
  disable_flow_control?: boolean | null;
  disable_link_detect?: boolean | null;
  offload?: OffloadConfig | null;
  ring_buffer?: RingBufferConfig | null;
  ip?: IPConfig | null;
  ipv6?: IPv6Config | null;
  dhcp_options?: DHCPOptionsConfig | null;
  dhcpv6_options?: DHCPv6OptionsConfig | null;
  vif?: VIFConfig[] | null;
  vif_s?: VIFSConfig[] | null;
  mirror?: MirrorConfig | null;
  eapol?: EAPoLConfig | null;
  evpn?: EVPNConfig | null;
}

// API Response types
export interface EthernetConfigResponse {
  interfaces: EthernetInterface[];
  total: number;
  by_type: Record<string, number>;
  by_vrf: Record<string, number>;
}

export interface EthernetCapabilities {
  version: string;
  version_number: number;
  device_name: string;
  features: {
    basic: Record<string, boolean>;
    ethernet: Record<string, boolean>;
    offload: Record<string, boolean>;
    ring_buffer: Record<string, boolean>;
    tcp_mss: Record<string, boolean>;
    arp: Record<string, boolean>;
    ip: Record<string, boolean>;
    ipv6: Record<string, boolean>;
    flow_control: boolean;
    link_detect: boolean;
    dhcp: Record<string, boolean>;
    dhcpv6: Record<string, boolean>;
    vlan: Record<string, boolean>;
    port_mirror: Record<string, boolean>;
    eapol: Record<string, boolean>;
    evpn: Record<string, boolean>;
  };
  operations: Record<string, string[]>;
  version_info: {
    current: string;
    supported_versions: string[];
    differences: Record<string, unknown>;
  };
  statistics: {
    total_operations: number;
    version_specific_operations: number;
  };
}

// Batch operation types
export interface BatchOperation {
  op: string;
  value?: string;
}

export interface BatchRequest {
  interface: string;
  operations: BatchOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}
