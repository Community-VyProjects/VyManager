import { Activity, Shield, ShieldAlert, Network, Lock, LayoutDashboard, Server, Settings, HeartPulse, Route as RouteIcon, Scale, ArrowLeftRight, Box, Waypoints, KeyRound, Globe, Globe2, ListTree, Link2, Radio, Phone, Key, Terminal } from "lucide-react";
import { FeatureGroup } from "@/lib/api/user-management";

export interface NavSection {
  id: string;
  title: string;
  href: string;
  description?: string;
  searchParams?: Record<string, string>;
}

export interface NavChild {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  requiredPermission?: FeatureGroup;
  sections?: NavSection[];
  /** Indexed for search but not shown as a sidebar link */
  searchOnly?: boolean;
}

export interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredPermission?: FeatureGroup;
  sections?: NavSection[];
  children?: NavChild[];
  /** Top-level item only in search index, hidden from sidebar */
  searchOnly?: boolean;
}

export const navigation: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Firewall",
    icon: ShieldAlert,
    children: [
      { title: "Policies", href: "/firewall/policies", requiredPermission: FeatureGroup.FIREWALL_POLICIES, sections: [
          { id: "ipv4", title: "IPv4", href: "/firewall/policies", description: "IPv4 firewall policies", searchParams: { section: "ipv4" } },
          { id: "ipv6", title: "IPv6", href: "/firewall/policies", description: "IPv6 firewall policies", searchParams: { section: "ipv6" } },
        ] },
      { title: "Custom Chains", href: "/firewall/policies", requiredPermission: FeatureGroup.FIREWALL_POLICIES, searchOnly: true, sections: [
          { id: "custom-chains", title: "Custom Chains", href: "/firewall/policies", description: "Manage custom firewall chains", searchParams: { section: "ipv4", view: "custom-chains" } },
          { id: "chains-rules", title: "Chain Rules", href: "/firewall/policies", description: "Rules within custom chains", searchParams: { section: "ipv4", view: "custom-chains" } },
        ] },
      { title: "Bridge", href: "/firewall/bridge", requiredPermission: FeatureGroup.FIREWALL_BRIDGE },
      { title: "Groups", href: "/firewall/groups", requiredPermission: FeatureGroup.FIREWALL_GROUPS },
      { title: "Zones", href: "/firewall/zones", requiredPermission: FeatureGroup.FIREWALL_ZONES },
      { title: "Global Options", href: "/firewall/global-options", requiredPermission: FeatureGroup.FIREWALL_GLOBAL_OPTIONS, sections: [
          { id: "icmp-settings", title: "ICMP Settings", href: "/firewall/global-options", description: "Firewall ICMP options", searchParams: { section: "icmp-settings" } },
          { id: "source-routing", title: "Source Routing", href: "/firewall/global-options", description: "Firewall source routing", searchParams: { section: "source-routing" } },
          { id: "icmp-redirects", title: "ICMP Redirects", href: "/firewall/global-options", description: "ICMP redirect behavior", searchParams: { section: "icmp-redirects" } },
          { id: "security-options", title: "Security Options", href: "/firewall/global-options", description: "Firewall security options", searchParams: { section: "security-options" } },
          { id: "state-policies", title: "State Policies", href: "/firewall/global-options", description: "Firewall state policy settings", searchParams: { section: "state-policies" } },
          { id: "bridged-traffic", title: "Bridged Traffic", href: "/firewall/global-options", description: "Firewall bridged traffic options", searchParams: { section: "bridged-traffic" } },
          { id: "connection-timeouts", title: "Connection Timeouts", href: "/firewall/global-options", description: "Firewall connection timeout settings", searchParams: { section: "connection-timeouts" } },
        ] },
      { title: "Flowtables", href: "/firewall/flowtables", requiredPermission: FeatureGroup.FIREWALL_FLOWTABLES },
    ],
  },
  { title: "Interfaces", href: "/network/interfaces", icon: Network, requiredPermission: FeatureGroup.INTERFACES, sections: [
      { id: "ethernet", title: "Ethernet", href: "/network/interfaces", description: "Ethernet interface configuration", searchParams: { type: "ethernet" } },
      { id: "vlan", title: "VLAN", href: "/network/interfaces", description: "802.1Q VLAN and QinQ sub-interfaces", searchParams: { type: "vlan" } },
      { id: "wireguard", title: "WireGuard", href: "/network/interfaces", description: "WireGuard VPN interfaces", searchParams: { type: "wireguard" } },
      { id: "vxlan", title: "VXLAN", href: "/network/interfaces", description: "VXLAN overlay interfaces", searchParams: { type: "vxlan" } },
      { id: "tunnel", title: "Tunnel", href: "/network/interfaces", description: "Tunnel interfaces (GRE, IPIP, etc.)", searchParams: { type: "tunnel" } },
      { id: "bonding", title: "Bonding", href: "/network/interfaces", description: "Bonded interfaces", searchParams: { type: "bonding" } },
      { id: "bridge", title: "Bridge", href: "/network/interfaces", description: "Bridge interfaces", searchParams: { type: "bridge" } },
      { id: "dummy", title: "Dummy", href: "/network/interfaces", description: "Dummy interfaces", searchParams: { type: "dummy" } },
      { id: "geneve", title: "GENEVE", href: "/network/interfaces", description: "GENEVE overlay interfaces", searchParams: { type: "geneve" } },
      { id: "input", title: "Input", href: "/network/interfaces", description: "Input-only interfaces", searchParams: { type: "input" } },
      { id: "l2tpv3", title: "L2TPv3", href: "/network/interfaces", description: "L2TPv3 interfaces", searchParams: { type: "l2tpv3" } },
      { id: "loopback", title: "Loopback", href: "/network/interfaces", description: "Loopback interfaces", searchParams: { type: "loopback" } },
      { id: "macsec", title: "MACsec", href: "/network/interfaces", description: "MACsec secure tunnel interfaces", searchParams: { type: "macsec" } },
      { id: "pppoe", title: "PPPoE", href: "/network/interfaces", description: "PPPoE interfaces", searchParams: { type: "pppoe" } },
      { id: "pseudo-ethernet", title: "Pseudo-Ethernet", href: "/network/interfaces", description: "Pseudo-Ethernet interfaces", searchParams: { type: "pseudo-ethernet" } },
      { id: "sstpc", title: "SSTPC", href: "/network/interfaces", description: "SSTPC interfaces", searchParams: { type: "sstpc" } },
      { id: "virtual-ethernet", title: "Virtual Ethernet", href: "/network/interfaces", description: "Virtual Ethernet interfaces", searchParams: { type: "virtual-ethernet" } },
      { id: "vpp", title: "VPP", href: "/network/interfaces", description: "VPP interfaces", searchParams: { type: "vpp" } },
      { id: "vti", title: "VTI", href: "/network/interfaces", description: "VTI interfaces", searchParams: { type: "vti" } },
      { id: "wireless", title: "Wireless", href: "/network/interfaces", description: "Wireless interfaces", searchParams: { type: "wireless" } },
      { id: "wwan", title: "WWAN", href: "/network/interfaces", description: "WWAN interfaces", searchParams: { type: "wwan" } },
    ] },
  {
    title: "NAT",
    icon: ArrowLeftRight,
    children: [
      {
        title: "NAT",
        href: "/network/nat",
        icon: Link2,
        requiredPermission: FeatureGroup.NAT,
        sections: [
          { id: "destination-nat", title: "Destination NAT", href: "/network/nat", description: "Destination NAT (DNAT) rules", searchParams: { type: "destination" } },
          { id: "static-nat", title: "Static NAT", href: "/network/nat", description: "Static NAT mappings", searchParams: { type: "static" } },
          { id: "cgnat", title: "CGNAT", href: "/network/nat", description: "Carrier-grade NAT (CGNAT) rules", searchParams: { type: "cgnat" } },
          { id: "nat-rule-id", title: "Rule ID", href: "/network/nat", description: "Search NAT by rule ID or description", searchParams: { type: "rule-id" } },
        ],
      },
      { title: "NAT64", href: "/network/nat64", icon: Globe, requiredPermission: FeatureGroup.NAT64 },
      { title: "NAT66", href: "/network/nat66", icon: Globe2, requiredPermission: FeatureGroup.NAT66 },
    ],
  },
  {
    title: "Service",
    icon: Radio,
    children: [
      { title: "Broadcast Relay", href: "/service/broadcast-relay", requiredPermission: FeatureGroup.BROADCAST_RELAY },
      { title: "Config Sync", href: "/service/config-sync", requiredPermission: FeatureGroup.CONFIG_SYNC },
      { title: "Conntrack Sync", href: "/service/conntrack-sync", requiredPermission: FeatureGroup.CONNTRACK_SYNC },
      { title: "Console Server", href: "/service/console-server", requiredPermission: FeatureGroup.CONSOLE_SERVER },
      { title: "DHCP", href: "/network/dhcp", requiredPermission: FeatureGroup.DHCP},
      { title: "DHCP Relay", href: "/service/dhcp-relay", requiredPermission: FeatureGroup.DHCP_RELAY },
      { title: "DHCPv6 Relay", href: "/service/dhcpv6-relay", requiredPermission: FeatureGroup.DHCPV6_RELAY },
      { title: "DHCPv6 Server", href: "/service/dhcpv6-server", requiredPermission: FeatureGroup.DHCPV6_SERVER },
      { title: "DNS Forwarding", href: "/service/dns-forwarding", requiredPermission: FeatureGroup.DNS_FORWARDING },
      { title: "DNS Dynamic", href: "/service/dns-dynamic", requiredPermission: FeatureGroup.DNS_DYNAMIC },
      { title: "Event Handler", href: "/service/event-handler", requiredPermission: FeatureGroup.EVENT_HANDLER },
      { title: "HTTPS", href: "/service/https", requiredPermission: FeatureGroup.HTTPS },
      { title: "IPoE Server", href: "/service/ipoe-server", requiredPermission: FeatureGroup.IPOE_SERVER },
      { title: "LLDP", href: "/service/lldp", requiredPermission: FeatureGroup.LLDP },
      { title: "Monitoring", href: "/service/monitoring", requiredPermission: FeatureGroup.SERVICE_MONITORING },
      { title: "NDP Proxy", href: "/service/ndp-proxy", requiredPermission: FeatureGroup.NDP_PROXY },
      { title: "NTP", href: "/service/ntp", requiredPermission: FeatureGroup.NTP },
      { title: "PPPoE Server", href: "/service/pppoe-server", requiredPermission: FeatureGroup.PPPOE },
      { title: "Router Advert", href: "/service/router-advert", requiredPermission: FeatureGroup.ROUTER_ADVERT },
      { title: "Salt Minion", href: "/service/salt-minion", requiredPermission: FeatureGroup.SALT_MINION },
      { title: "SLA", href: "/service/sla", requiredPermission: FeatureGroup.SLA },
      { title: "SNMP", href: "/service/snmp", requiredPermission: FeatureGroup.SNMP },
      { title: "SSH", href: "/service/ssh", requiredPermission: FeatureGroup.SSH },
      { title: "TFTP Server", href: "/service/tftp-server", requiredPermission: FeatureGroup.TFTP_SERVER },
    ],
  },
  {
    title: "VRF",
    href: "/network/vrf",
    icon: Waypoints,
    requiredPermission: FeatureGroup.VRF,
    sections: [
      { id: "vrf-instances", title: "VRF Instances", href: "/network/vrf", description: "List and manage VRF instances", searchParams: { tab: "instances" } },
    ],
  },
  {
    title: "Routing",
    icon: RouteIcon,
    children: [
      { title: "Unicast Protocols", href: "/routing/unicast-protocols", requiredPermission: FeatureGroup.UNICAST_PROTOCOLS, sections: [
          { id: "bgp", title: "BGP", href: "/routing/unicast-protocols", description: "BGP routing protocol, neighbors and sessions", searchParams: { protocol: "bgp" } },
          { id: "bgp-overview", title: "BGP Overview", href: "/routing/unicast-protocols", description: "BGP overview and summary", searchParams: { protocol: "bgp", tab: "overview" } },
          { id: "bgp-neighbors", title: "BGP Neighbors", href: "/routing/unicast-protocols", description: "BGP neighbor list and details", searchParams: { protocol: "bgp", tab: "neighbors" } },
          { id: "bgp-peer-groups", title: "BGP Peer Groups", href: "/routing/unicast-protocols", description: "Manage BGP peer groups", searchParams: { protocol: "bgp", tab: "peer-groups" } },
          { id: "ospf", title: "OSPF", href: "/routing/unicast-protocols", description: "OSPF routing protocol and areas", searchParams: { protocol: "ospf" } },
          { id: "ospfv3", title: "OSPFv3", href: "/routing/unicast-protocols", description: "OSPFv3 for IPv6", searchParams: { protocol: "ospfv3" } },
          { id: "isis", title: "IS-IS", href: "/routing/unicast-protocols", description: "IS-IS routing protocol", searchParams: { protocol: "isis" } },
          { id: "openfabric", title: "OpenFabric", href: "/routing/unicast-protocols", description: "OpenFabric routing protocol", searchParams: { protocol: "openfabric" } },
          { id: "rip", title: "RIP", href: "/routing/unicast-protocols", description: "RIP routing protocol", searchParams: { protocol: "rip" } },
          { id: "ripng", title: "RIPng", href: "/routing/unicast-protocols", description: "RIPng IPv6 routing", searchParams: { protocol: "ripng" } },
          { id: "babel", title: "Babel", href: "/routing/unicast-protocols", description: "Babel routing protocol", searchParams: { protocol: "babel" } },
        ] },
      { title: "Static & Failover", href: "/routing/static-failover", requiredPermission: FeatureGroup.STATIC_ROUTES, sections: [
          { id: "static-routes", title: "Static Routes", href: "/routing/static-failover/static-routes", description: "Manage static routes", searchParams: { section: "routes" } },
          { id: "static-arp", title: "Static ARP", href: "/routing/static-failover/static-routes", description: "Manage static ARP entries", searchParams: { section: "arp" } },
          { id: "multicast-routes", title: "Multicast Routes", href: "/routing/static-failover/static-routes", description: "Manage multicast routes", searchParams: { section: "mroute" } },
          { id: "neighbor-proxy", title: "Neighbor Proxy", href: "/routing/static-failover/static-routes", description: "Manage neighbor proxies", searchParams: { section: "neighbor-proxy" } },
          { id: "routing-tables", title: "Routing Tables", href: "/routing/static-failover/static-routes", description: "Manage routing tables", searchParams: { section: "tables" } },
        ] },
      {
        title: "Routing Infrastructure",
        href: "/routing/infrastructure",
        requiredPermission: FeatureGroup.ROUTING_INFRASTRUCTURE,
        sections: [
          { id: "bfd", title: "BFD", href: "/routing/infrastructure", description: "Bidirectional Forwarding Detection", searchParams: { section: "bfd" } },
          { id: "mpls", title: "MPLS", href: "/routing/infrastructure", description: "Multiprotocol Label Switching", searchParams: { section: "mpls" } },
          { id: "segment-routing", title: "Segment Routing", href: "/routing/infrastructure", description: "Source routing with segments", searchParams: { section: "segment-routing" } },
          { id: "nhrp", title: "NHRP", href: "/routing/infrastructure", description: "Next Hop Resolution Protocol", searchParams: { section: "nhrp" } },
          { id: "rpki", title: "RPKI", href: "/routing/infrastructure", description: "Resource Public Key Infrastructure", searchParams: { section: "rpki" } },
          { id: "traffic-engineering", title: "Traffic Engineering", href: "/routing/infrastructure", description: "MPLS-TE link parameter configuration", searchParams: { section: "traffic-engineering" } },
        ],
      },
      { title: "Multicast", href: "/routing/multicast", requiredPermission: FeatureGroup.MULTICAST },
    ],
  },
{ title: "PKI", href: "/pki", icon: KeyRound, requiredPermission: FeatureGroup.PKI, sections: [
      { id: "certificates", title: "Certificates", href: "/pki", description: "Manage certificates", searchParams: { tab: "certificates" } },
      { id: "ca", title: "Certificate Authorities", href: "/pki", description: "Manage certificate authorities", searchParams: { tab: "ca" } },
      { id: "keypairs", title: "Key Pairs", href: "/pki", description: "Manage cryptographic key pairs", searchParams: { tab: "keypairs" } },
      { id: "dh", title: "DH Parameters", href: "/pki", description: "Manage DH parameters", searchParams: { tab: "dh" } },
      { id: "openssh", title: "OpenSSH", href: "/pki", description: "Manage OpenSSH keys", searchParams: { tab: "openssh" } },
      { id: "openvpn", title: "OpenVPN", href: "/pki", description: "Manage OpenVPN shared secrets", searchParams: { tab: "openvpn" } },
      { id: "x509", title: "X509 Defaults", href: "/pki", description: "Manage X509 default settings", searchParams: { tab: "x509" } },
    ] },
  {
    title: "Policies",
    icon: ListTree,
    children: [
      { title: "Access List", href: "/policies/access-list", requiredPermission: FeatureGroup.ACCESS_LIST, sections: [
          { id: "ipv4", title: "IPv4", href: "/policies/access-list", description: "IPv4 access lists", searchParams: { section: "ipv4" } },
          { id: "ipv6", title: "IPv6", href: "/policies/access-list", description: "IPv6 access lists", searchParams: { section: "ipv6" } },
        ] },
      { title: "Prefix List", href: "/policies/prefix-list", requiredPermission: FeatureGroup.PREFIX_LIST, sections: [
          { id: "ipv4", title: "IPv4", href: "/policies/prefix-list", description: "IPv4 prefix lists", searchParams: { section: "ipv4" } },
          { id: "ipv6", title: "IPv6", href: "/policies/prefix-list", description: "IPv6 prefix lists", searchParams: { section: "ipv6" } },
        ] },
      { title: "Route", href: "/policies/route", requiredPermission: FeatureGroup.ROUTE_POLICY, sections: [
          { id: "route", title: "IPv4", href: "/policies/route", description: "IPv4 route policies", searchParams: { section: "route" } },
          { id: "route6", title: "IPv6", href: "/policies/route", description: "IPv6 route policies", searchParams: { section: "route6" } },
        ] },
      { title: "Route Map", href: "/policies/route-map", requiredPermission: FeatureGroup.ROUTE_MAP },
      { title: "Local Route", href: "/policies/local-route", requiredPermission: FeatureGroup.LOCAL_ROUTE, sections: [
          { id: "ipv4", title: "IPv4", href: "/policies/local-route", description: "IPv4 local routes", searchParams: { section: "ipv4" } },
          { id: "ipv6", title: "IPv6", href: "/policies/local-route", description: "IPv6 local routes", searchParams: { section: "ipv6" } },
        ] },
      { title: "BGP AS", href: "/policies/bgp-as", requiredPermission: FeatureGroup.BGP_AS_PATH },
      { title: "BGP Community", href: "/policies/bgp-community", requiredPermission: FeatureGroup.BGP_COMMUNITY },
      { title: "BGP Extended Community", href: "/policies/bgp-extended-community", requiredPermission: FeatureGroup.BGP_EXTENDED_COMMUNITY },
      { title: "BGP Large Community", href: "/policies/bgp-large-community", requiredPermission: FeatureGroup.BGP_LARGE_COMMUNITY },
    ],
  },
  {
    title: "VPN",
    icon: Lock,
    children: [
      {
        title: "IPsec",
        href: "/vpn/ipsec",
        icon: Shield,
        requiredPermission: FeatureGroup.IPSEC,
        sections: [
          { id: "s2s", title: "Site-to-Site", href: "/vpn/ipsec", description: "Site-to-site IPSec tunnels", searchParams: { tab: "s2s" } },
          { id: "ra", title: "Remote Access", href: "/vpn/ipsec", description: "Remote access IPSec connections", searchParams: { tab: "ra" } },
          { id: "ike", title: "IKE Groups", href: "/vpn/ipsec", description: "IKE group settings", searchParams: { tab: "ike" } },
          { id: "esp", title: "ESP Groups", href: "/vpn/ipsec", description: "ESP group settings", searchParams: { tab: "esp" } },
          { id: "auth", title: "Authentication", href: "/vpn/ipsec", description: "IPSec authentication settings", searchParams: { tab: "auth" } },
          { id: "pools", title: "Pools", href: "/vpn/ipsec", description: "Remote access pool configuration", searchParams: { tab: "pools" } },
          { id: "settings", title: "Settings", href: "/vpn/ipsec", description: "IPSec general settings", searchParams: { tab: "settings" } },
        ],
      },
      {
        title: "L2TP",
        href: "/vpn/l2tp",
        icon: Phone,
        requiredPermission: FeatureGroup.L2TP,
        sections: [
          { id: "overview", title: "Overview", href: "/vpn/l2tp", description: "L2TP overview", searchParams: { tab: "overview" } },
          { id: "users", title: "Local Users", href: "/vpn/l2tp", description: "Local user management", searchParams: { tab: "users" } },
          { id: "radius", title: "RADIUS", href: "/vpn/l2tp", description: "RADIUS settings", searchParams: { tab: "radius" } },
          { id: "pools", title: "IP Pools", href: "/vpn/l2tp", description: "IPv4 pool configuration", searchParams: { tab: "pools" } },
          { id: "ipv6pools", title: "IPv6 Pools", href: "/vpn/l2tp", description: "IPv6 pool configuration", searchParams: { tab: "ipv6pools" } },
          { id: "auth", title: "Authentication", href: "/vpn/l2tp", description: "L2TP authentication settings", searchParams: { tab: "auth" } },
        ],
      },
      { title: "OpenVPN", href: "/vpn/openvpn", icon: Key, requiredPermission: FeatureGroup.OPENVPN },
      { title: "WireGuard", href: "/vpn/wireguard", icon: Lock, requiredPermission: FeatureGroup.WIREGUARD },
    ],
  },
  { title: "Load Balancing", icon: Scale, requiredPermission: FeatureGroup.LOAD_BALANCING, children: [
      { title: "HAProxy", href: "/load-balancing/haproxy", icon: Scale, requiredPermission: FeatureGroup.LOAD_BALANCING, sections: [
          { id: "haproxy-frontends", title: "Frontends", href: "/load-balancing/haproxy", description: "HAProxy frontends and listeners", searchParams: { tab: "frontends" } },
          { id: "haproxy-backends", title: "Backends", href: "/load-balancing/haproxy", description: "HAProxy backends and servers", searchParams: { tab: "backends" } },
          { id: "haproxy-services", title: "Services", href: "/load-balancing/haproxy", description: "HAProxy services and backends rules", searchParams: { tab: "services" } },
          { id: "haproxy-rules", title: "Routing Rules", href: "/load-balancing/haproxy", description: "HAProxy routing and HTTP rules", searchParams: { tab: "rules" } },
        ] },
      { title: "WAN", href: "/load-balancing/wan", icon: Globe, requiredPermission: FeatureGroup.LOAD_BALANCING },
    ],
  },
  { title: "High Availability", href: "/network/high-availability", icon: HeartPulse, requiredPermission: FeatureGroup.HIGH_AVAILABILITY, sections: [
      { id: "vrrp", title: "VRRP Groups", href: "/network/high-availability", description: "Manage VRRP group configuration", searchParams: { tab: "vrrp" } },
      { id: "sync", title: "Sync Groups", href: "/network/high-availability", description: "Manage HA sync group configuration", searchParams: { tab: "sync" } },
      { id: "vs", title: "Virtual Servers", href: "/network/high-availability", description: "Manage HA virtual servers", searchParams: { tab: "vs" } },
    ] },
  { title: "Monitoring", href: "/monitoring", icon: Activity, requiredPermission: FeatureGroup.MONITORING, sections: [
      { id: "monitor-traffic", title: "Monitor Traffic", href: "/monitoring", description: "Capture traffic on an interface", searchParams: { command: "monitor_traffic" } },
      { id: "view-logs", title: "View Logs", href: "/monitoring", description: "Tail system logs", searchParams: { command: "monitor_log" } },
      { id: "monitor-conntrack", title: "Monitor Conntrack", href: "/monitoring", description: "Inspect connection tracking state", searchParams: { command: "monitor_conntrack" } },
      { id: "log-tail", title: "Log Tail", href: "/monitoring", description: "Show the recent log tail", searchParams: { command: "show_log_tail" } },
    ] },
  {
    title: "System",
    href: "/system/settings",
    icon: Server,
    requiredPermission: FeatureGroup.SYSTEM,
    sections: [
      { id: "general", title: "General", href: "/system/settings", description: "General system settings", searchParams: { tab: "general" } },
      { id: "users", title: "Users & Login", href: "/system/settings", description: "User and login management", searchParams: { tab: "users" } },
      { id: "syslog", title: "Syslog", href: "/system/settings", description: "Syslog configuration", searchParams: { tab: "syslog" } },
      { id: "conntrack", title: "Conntrack", href: "/system/settings", description: "Conntrack settings", searchParams: { tab: "conntrack" } },
      { id: "conntrack-table-sizes", title: "Table Sizes", href: "/system/settings", description: "Conntrack table size settings", searchParams: { tab: "conntrack", section: "table-sizes" } },
      { id: "conntrack-tcp-settings", title: "TCP Settings", href: "/system/settings", description: "Conntrack TCP timeout settings", searchParams: { tab: "conntrack", section: "tcp-settings" } },
      { id: "hostmap", title: "Host Mapping", href: "/system/settings", description: "Host mapping configuration", searchParams: { tab: "hostmap" } },
      { id: "advanced", title: "Advanced", href: "/system/settings", description: "Advanced system settings", searchParams: { tab: "advanced" } },
    ],
  },
  { title: "Containers", href: "/system/containers", icon: Box, requiredPermission: FeatureGroup.CONTAINER, sections: [
      { id: "containers-running", title: "Running Containers", href: "/system/containers", description: "List running containers", searchParams: { tab: "running" } },
      { id: "container-images", title: "Images", href: "/system/containers", description: "Manage container images", searchParams: { tab: "images" } },
      { id: "container-networks", title: "Networks", href: "/system/containers", description: "Container networks and bridges", searchParams: { tab: "networks" } },
    ] },
  { title: "Console", href: "/console", icon: Terminal, requiredPermission: FeatureGroup.SSH_CONSOLE },
  { title: "Settings", href: "/settings", icon: Settings },
];

/** Sidebar-visible navigation (excludes search-only entries) */
export function getSidebarNavigation(): NavItem[] {
  return navigation
    .filter((item) => !item.searchOnly)
    .map((item) => {
      if (!item.children) return item;
      const children = item.children.filter((c) => !c.searchOnly);
      return children.length === item.children.length ? item : { ...item, children };
    })
    .filter((item) => !item.children || item.children.length > 0);
}
