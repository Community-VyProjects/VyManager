import { Activity, Shield, ShieldCheck, Network, Route, Lock, FileText, LayoutDashboard, Server, Settings, HeartPulse, Route as RouteIcon, Scale } from "lucide-react";
import { FeatureGroup } from "@/lib/api/user-management";

export interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredPermission?: FeatureGroup;
  children?: {
    title: string;
    href: string;
    requiredPermission?: FeatureGroup;
  }[];
}

export const navigation: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Firewall",
    icon: Shield,
    children: [
      { title: "Policies", href: "/firewall/policies", requiredPermission: FeatureGroup.FIREWALL_POLICIES },
      { title: "Bridge", href: "/firewall/bridge", requiredPermission: FeatureGroup.FIREWALL_BRIDGE },
      { title: "Groups", href: "/firewall/groups", requiredPermission: FeatureGroup.FIREWALL_GROUPS },
      { title: "Zones", href: "/firewall/zones", requiredPermission: FeatureGroup.FIREWALL_ZONES },
      { title: "Global Options", href: "/firewall/global-options", requiredPermission: FeatureGroup.FIREWALL_GLOBAL_OPTIONS },
      { title: "Flowtables", href: "/firewall/flowtables", requiredPermission: FeatureGroup.FIREWALL_FLOWTABLES },
    ],
  },
  {
    title: "Network",
    icon: Network,
    children: [
      { title: "DHCP", href: "/network/dhcp", requiredPermission: FeatureGroup.DHCP },
      { title: "VRF", href: "/network/vrf", requiredPermission: FeatureGroup.VRF },
      { title: "Interfaces", href: "/network/interfaces", requiredPermission: FeatureGroup.INTERFACES },
      { title: "NAT", href: "/network/nat", requiredPermission: FeatureGroup.NAT },
      { title: "NAT64", href: "/network/nat64", requiredPermission: FeatureGroup.NAT64 },
      { title: "NAT66", href: "/network/nat66", requiredPermission: FeatureGroup.NAT66 },
    ],
  },
  {
    title: "Routing",
    icon: RouteIcon,
    children: [
      { title: "Unicast Protocols", href: "/routing/unicast-protocols", requiredPermission: FeatureGroup.UNICAST_PROTOCOLS },
      { title: "Static & Failover", href: "/routing/static-failover", requiredPermission: FeatureGroup.STATIC_ROUTES },
      { title: "Routing Infrastructure", href: "/routing/infrastructure", requiredPermission: FeatureGroup.ROUTING_INFRASTRUCTURE },
      { title: "Multicast", href: "/routing/multicast", requiredPermission: FeatureGroup.MULTICAST },
    ],
  },
  { title: "PKI", href: "/pki", icon: ShieldCheck, requiredPermission: FeatureGroup.PKI },
  {
    title: "Policies",
    icon: FileText,
    children: [
      { title: "Access List", href: "/policies/access-list", requiredPermission: FeatureGroup.ACCESS_LIST },
      { title: "Prefix List", href: "/policies/prefix-list", requiredPermission: FeatureGroup.PREFIX_LIST },
      { title: "Route", href: "/policies/route", requiredPermission: FeatureGroup.ROUTE_POLICY },
      { title: "Route Map", href: "/policies/route-map", requiredPermission: FeatureGroup.ROUTE_MAP },
      { title: "Local Route", href: "/policies/local-route", requiredPermission: FeatureGroup.LOCAL_ROUTE },
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
      { title: "IPsec", href: "/vpn/ipsec", requiredPermission: FeatureGroup.IPSEC },
      { title: "WireGuard", href: "/vpn/wireguard", requiredPermission: FeatureGroup.WIREGUARD },
      { title: "L2TP", href: "/vpn/l2tp", requiredPermission: FeatureGroup.L2TP },
    ],
  },
  { title: "Load Balancing", icon: Scale, requiredPermission: FeatureGroup.LOAD_BALANCING, children: [
      { title: "HAProxy", href: "/load-balancing/haproxy", requiredPermission: FeatureGroup.LOAD_BALANCING },
      { title: "WAN", href: "/load-balancing/wan", requiredPermission: FeatureGroup.LOAD_BALANCING },
    ],
  },
  { title: "High Availability", href: "/network/high-availability", icon: HeartPulse, requiredPermission: FeatureGroup.HIGH_AVAILABILITY },
  { title: "Monitoring", href: "/monitoring", icon: Activity, requiredPermission: FeatureGroup.MONITORING },
  { title: "System", href: "/system/settings", icon: Server, requiredPermission: FeatureGroup.SYSTEM },
  { title: "Settings", href: "/settings", icon: Settings },
];
