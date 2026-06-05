// Shared per-instance feature-permission taxonomy.
//
// Single source of truth for the feature tree used by both the user-management
// access panel and the SSO role-mapping modal. These feature keys are stored as
// free text in `user_feature_permissions.feature` (see prisma/schema.prisma).
//
// NOTE: intentionally free of any API-client imports so it stays cheap to load.

import { FeatureGroup } from "@/lib/api/user-management";

export interface FeatureHierarchy {
  feature: FeatureGroup;
  children?: FeatureHierarchy[];
  binary?: boolean; // true = single "Allow access" toggle instead of Edit/View
}

export interface FeatureCategory {
  name: string;
  description: string;
  features: FeatureHierarchy[];
}

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    name: "VyOS Configuration",
    description: "Network and routing features",
    features: [
      {
        feature: FeatureGroup.FIREWALL,
        children: [
          { feature: FeatureGroup.FIREWALL_POLICIES },
          { feature: FeatureGroup.FIREWALL_GROUPS },
          { feature: FeatureGroup.FIREWALL_ZONES },
          { feature: FeatureGroup.FIREWALL_GLOBAL_OPTIONS },
          { feature: FeatureGroup.FIREWALL_BRIDGE },
          { feature: FeatureGroup.FIREWALL_FLOWTABLES },
        ],
      },
      {
        feature: FeatureGroup.INTERFACES,
        children: [
          { feature: FeatureGroup.BONDING },
          { feature: FeatureGroup.BRIDGE },
          { feature: FeatureGroup.DUMMY },
          { feature: FeatureGroup.ETHERNET },
          { feature: FeatureGroup.GENEVE },
          { feature: FeatureGroup.INPUT_IFACE },
          { feature: FeatureGroup.LOOPBACK },
          { feature: FeatureGroup.MACSEC },
          { feature: FeatureGroup.PPPOE },
          { feature: FeatureGroup.PSEUDO_ETHERNET },
          { feature: FeatureGroup.SSTPC },
          { feature: FeatureGroup.TUNNEL },
          { feature: FeatureGroup.VIRTUAL_ETHERNET },
          { feature: FeatureGroup.VLAN },
          { feature: FeatureGroup.VPP },
          { feature: FeatureGroup.VTI },
          { feature: FeatureGroup.VXLAN },
          { feature: FeatureGroup.WIRELESS },
          { feature: FeatureGroup.WWAN },
        ],
      },
      {
        feature: FeatureGroup.NAT,
        children: [
          { feature: FeatureGroup.NAT64 },
          { feature: FeatureGroup.NAT66 },
        ],
      },
      {
        feature: FeatureGroup.SERVICE,
        children: [
          { feature: FeatureGroup.BROADCAST_RELAY },
          { feature: FeatureGroup.CONFIG_SYNC },
          { feature: FeatureGroup.CONNTRACK_SYNC },
          { feature: FeatureGroup.CONSOLE_SERVER },
          { feature: FeatureGroup.DHCP_RELAY },
          { feature: FeatureGroup.DHCPV6_RELAY },
          { feature: FeatureGroup.DHCPV6_SERVER },
          { feature: FeatureGroup.DNS_FORWARDING },
          { feature: FeatureGroup.DNS_DYNAMIC },
          { feature: FeatureGroup.EVENT_HANDLER },
          { feature: FeatureGroup.HTTPS },
          { feature: FeatureGroup.IPOE_SERVER },
          { feature: FeatureGroup.LLDP },
          { feature: FeatureGroup.NDP_PROXY },
          { feature: FeatureGroup.NTP },
          { feature: FeatureGroup.ROUTER_ADVERT },
          { feature: FeatureGroup.SALT_MINION },
          { feature: FeatureGroup.SERVICE_MONITORING },
          { feature: FeatureGroup.SLA },
          { feature: FeatureGroup.SNMP },
          { feature: FeatureGroup.SSH },
          { feature: FeatureGroup.DHCP },
        ],
      },
      { feature: FeatureGroup.CONTAINER },
      { feature: FeatureGroup.VRF },
      { feature: FeatureGroup.LOAD_BALANCING },
      { feature: FeatureGroup.HIGH_AVAILABILITY },
      {
        feature: FeatureGroup.ROUTING,
        children: [
          {
            feature: FeatureGroup.UNICAST_PROTOCOLS,
            children: [
              { feature: FeatureGroup.BGP },
              { feature: FeatureGroup.OSPF },
              { feature: FeatureGroup.OSPFV3 },
              { feature: FeatureGroup.ISIS },
              { feature: FeatureGroup.OPENFABRIC },
              { feature: FeatureGroup.RIP },
              { feature: FeatureGroup.RIPNG },
              { feature: FeatureGroup.BABEL },
            ],
          },
          { feature: FeatureGroup.STATIC_ROUTES },
          { feature: FeatureGroup.FAILOVER },
          {
            feature: FeatureGroup.ROUTING_INFRASTRUCTURE,
            children: [
              { feature: FeatureGroup.BFD },
              { feature: FeatureGroup.MPLS },
              { feature: FeatureGroup.SEGMENT_ROUTING },
              { feature: FeatureGroup.NHRP },
              { feature: FeatureGroup.RPKI },
              { feature: FeatureGroup.TRAFFIC_ENGINEERING },
            ],
          },
          {
            feature: FeatureGroup.MULTICAST,
            children: [
              { feature: FeatureGroup.IGMP_PROXY },
              { feature: FeatureGroup.PIM },
              { feature: FeatureGroup.PIM6 },
            ],
          },
        ],
      },
      {
        feature: FeatureGroup.ROUTING_POLICIES,
        children: [
          { feature: FeatureGroup.ACCESS_LIST },
          { feature: FeatureGroup.PREFIX_LIST },
          { feature: FeatureGroup.ROUTE_POLICY },
          { feature: FeatureGroup.ROUTE_MAP },
          { feature: FeatureGroup.LOCAL_ROUTE },
          { feature: FeatureGroup.BGP_AS_PATH },
          { feature: FeatureGroup.BGP_COMMUNITY },
          { feature: FeatureGroup.BGP_EXTENDED_COMMUNITY },
          { feature: FeatureGroup.BGP_LARGE_COMMUNITY },
        ],
      },
      {
        feature: FeatureGroup.VPN,
        children: [
          { feature: FeatureGroup.IPSEC },
          { feature: FeatureGroup.L2TP },
          { feature: FeatureGroup.OPENVPN },
          { feature: FeatureGroup.WIREGUARD },
        ],
      },
      { feature: FeatureGroup.PKI },
    ],
  },
  {
    name: "System & General",
    description: "System settings and monitoring",
    features: [
      { feature: FeatureGroup.SYSTEM },
      { feature: FeatureGroup.CONFIGURATION },
      { feature: FeatureGroup.DASHBOARD },
      { feature: FeatureGroup.POWER },
      { feature: FeatureGroup.MONITORING, binary: true },
      { feature: FeatureGroup.SSH_CONSOLE, binary: true },
    ],
  },
];

export const FEATURE_DISPLAY_NAMES: Record<FeatureGroup, string> = {
  [FeatureGroup.FIREWALL]: "Firewall",
  [FeatureGroup.NAT]: "NAT",
  [FeatureGroup.NAT64]: "NAT64",
  [FeatureGroup.NAT66]: "NAT66",
  [FeatureGroup.SERVICE]: "Service",
  [FeatureGroup.BROADCAST_RELAY]: "Broadcast Relay",
  [FeatureGroup.CONFIG_SYNC]: "Config Sync",
  [FeatureGroup.CONNTRACK_SYNC]: "Conntrack Sync",
  [FeatureGroup.CONSOLE_SERVER]: "Console Server",
  [FeatureGroup.DHCP_RELAY]: "DHCP Relay",
  [FeatureGroup.DHCPV6_RELAY]: "DHCPv6 Relay",
  [FeatureGroup.DHCPV6_SERVER]: "DHCPv6 Server",
  [FeatureGroup.DNS_FORWARDING]: "DNS Forwarding",
  [FeatureGroup.DNS_DYNAMIC]: "DNS Dynamic",
  [FeatureGroup.EVENT_HANDLER]: "Event Handler",
  [FeatureGroup.HTTPS]: "HTTPS",
  [FeatureGroup.IPOE_SERVER]: "IPoE Server",
  [FeatureGroup.LLDP]: "LLDP",
  [FeatureGroup.NDP_PROXY]: "NDP Proxy",
  [FeatureGroup.NTP]: "NTP",
  [FeatureGroup.ROUTER_ADVERT]: "Router Advertisement",
  [FeatureGroup.SALT_MINION]: "Salt Minion",
  [FeatureGroup.SERVICE_MONITORING]: "Service Monitoring",
  [FeatureGroup.SLA]: "SLA",
  [FeatureGroup.SNMP]: "SNMP",
  [FeatureGroup.SSH]: "SSH",
  [FeatureGroup.CONTAINER]: "Containers",
  [FeatureGroup.DHCP]: "DHCP",
  [FeatureGroup.INTERFACES]: "Interfaces",
  [FeatureGroup.FIREWALL_GROUPS]: "Firewall Groups",
  [FeatureGroup.FIREWALL_POLICIES]: "Firewall Policies",
  [FeatureGroup.FIREWALL_ZONES]: "Firewall Zones",
  [FeatureGroup.FIREWALL_GLOBAL_OPTIONS]: "Firewall Global Options",
  [FeatureGroup.FIREWALL_BRIDGE]: "Bridge Firewall",
  [FeatureGroup.FIREWALL_FLOWTABLES]: "Flowtables",
  [FeatureGroup.NETWORK]: "Network",
  [FeatureGroup.VRF]: "VRF",
  [FeatureGroup.LOAD_BALANCING]: "Load Balancing",
  [FeatureGroup.VPN]: "VPN",
  [FeatureGroup.IPSEC]: "IPsec",
  [FeatureGroup.WIREGUARD]: "WireGuard",
  [FeatureGroup.L2TP]: "L2TP",
  [FeatureGroup.OPENVPN]: "OpenVPN",
  [FeatureGroup.PPPOE]: "PPPoE",
  [FeatureGroup.SSTPC]: "SSTP Client",
  [FeatureGroup.PKI]: "PKI",
  [FeatureGroup.ROUTING]: "Routing",
  [FeatureGroup.UNICAST_PROTOCOLS]: "Unicast Protocols",
  [FeatureGroup.BGP]: "BGP",
  [FeatureGroup.OSPF]: "OSPF",
  [FeatureGroup.OSPFV3]: "OSPFv3",
  [FeatureGroup.ISIS]: "IS-IS",
  [FeatureGroup.OPENFABRIC]: "OpenFabric",
  [FeatureGroup.RIP]: "RIP",
  [FeatureGroup.RIPNG]: "RIPng",
  [FeatureGroup.BABEL]: "Babel",
  [FeatureGroup.STATIC_ROUTES]: "Static Routes",
  [FeatureGroup.FAILOVER]: "Failover",
  [FeatureGroup.ROUTING_INFRASTRUCTURE]: "Routing Infrastructure",
  [FeatureGroup.BFD]: "BFD",
  [FeatureGroup.MPLS]: "MPLS",
  [FeatureGroup.SEGMENT_ROUTING]: "Segment Routing",
  [FeatureGroup.NHRP]: "NHRP",
  [FeatureGroup.RPKI]: "RPKI",
  [FeatureGroup.TRAFFIC_ENGINEERING]: "Traffic Engineering",
  [FeatureGroup.ROUTING_POLICIES]: "Routing Policies",
  [FeatureGroup.ACCESS_LIST]: "Access List",
  [FeatureGroup.PREFIX_LIST]: "Prefix List",
  [FeatureGroup.ROUTE_POLICY]: "Route",
  [FeatureGroup.ROUTE_MAP]: "Route Map",
  [FeatureGroup.LOCAL_ROUTE]: "Local Route",
  [FeatureGroup.BGP_AS_PATH]: "BGP AS Path",
  [FeatureGroup.BGP_COMMUNITY]: "BGP Community",
  [FeatureGroup.BGP_EXTENDED_COMMUNITY]: "BGP Extended Community",
  [FeatureGroup.BGP_LARGE_COMMUNITY]: "BGP Large Community",
  [FeatureGroup.MULTICAST]: "Multicast",
  [FeatureGroup.IGMP_PROXY]: "IGMP Proxy",
  [FeatureGroup.PIM]: "PIM",
  [FeatureGroup.PIM6]: "PIM6",
  [FeatureGroup.SYSTEM]: "System",
  [FeatureGroup.CONFIGURATION]: "Configuration",
  [FeatureGroup.MONITORING]: "Monitoring",
  [FeatureGroup.SSH_CONSOLE]: "SSH Console",
  [FeatureGroup.DASHBOARD]: "Dashboard",
  [FeatureGroup.SITES_INSTANCES]: "Sites & Instances",
  [FeatureGroup.USER_MANAGEMENT]: "User Management",
  [FeatureGroup.POWER]: "Power",
  [FeatureGroup.HIGH_AVAILABILITY]: "High Availability",
  [FeatureGroup.VXLAN]: "VXLAN",
  [FeatureGroup.TUNNEL]: "Tunnels",
  [FeatureGroup.BONDING]: "Bonding",
  [FeatureGroup.BRIDGE]: "Bridge",
  [FeatureGroup.DUMMY]: "Dummy",
  [FeatureGroup.ETHERNET]: "Ethernet",
  [FeatureGroup.VLAN]: "VLAN",
  [FeatureGroup.GENEVE]: "GENEVE",
  [FeatureGroup.INPUT_IFACE]: "Input",
  [FeatureGroup.LOOPBACK]: "Loopback",
  [FeatureGroup.MACSEC]: "MACsec",
  [FeatureGroup.PSEUDO_ETHERNET]: "Pseudo-Ethernet",
  [FeatureGroup.VIRTUAL_ETHERNET]: "Virtual Ethernet",
  [FeatureGroup.VPP]: "VPP",
  [FeatureGroup.VTI]: "VTI",
  [FeatureGroup.WIRELESS]: "Wireless",
  [FeatureGroup.WWAN]: "WWAN",
};

export interface FlatFeature {
  feature: FeatureGroup;
  depth: number;
  binary: boolean;
}

export interface FlatFeatureCategory {
  name: string;
  description: string;
  items: FlatFeature[];
}

// feature -> [feature, ...all nested descendants], for parent→child cascading.
const FEATURE_DESCENDANTS = (() => {
  const map = new Map<FeatureGroup, FeatureGroup[]>();
  const collect = (node: FeatureHierarchy): FeatureGroup[] => {
    const out: FeatureGroup[] = [node.feature];
    for (const child of node.children ?? []) out.push(...collect(child));
    return out;
  };
  const walk = (nodes: FeatureHierarchy[]) => {
    for (const node of nodes) {
      map.set(node.feature, collect(node));
      if (node.children) walk(node.children);
    }
  };
  for (const cat of FEATURE_CATEGORIES) walk(cat.features);
  return map;
})();

/** A feature plus all of its nested descendant features (includes itself). */
export function getFeatureAndDescendants(feature: FeatureGroup): FeatureGroup[] {
  return FEATURE_DESCENDANTS.get(feature) ?? [feature];
}

/**
 * Flatten FEATURE_CATEGORIES into per-category ordered lists with indentation
 * depth, de-duplicating repeated feature keys. Convenient for simple checkbox
 * rendering (e.g. the SSO role-mapping modal).
 */
export function getFlatFeatureCategories(): FlatFeatureCategory[] {
  const seen = new Set<FeatureGroup>();

  const walk = (nodes: FeatureHierarchy[], depth: number, out: FlatFeature[]) => {
    for (const node of nodes) {
      if (!seen.has(node.feature)) {
        seen.add(node.feature);
        out.push({ feature: node.feature, depth, binary: node.binary ?? false });
      }
      if (node.children?.length) walk(node.children, depth + 1, out);
    }
  };

  return FEATURE_CATEGORIES.map((cat) => {
    const items: FlatFeature[] = [];
    walk(cat.features, 0, items);
    return { name: cat.name, description: cat.description, items };
  });
}
