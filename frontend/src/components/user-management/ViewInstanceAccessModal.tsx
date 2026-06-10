"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Shield,
  Eye,
  Edit3,
  User,
  ChevronDown,
  ChevronRight,
  Server,
  Building2,
  Search,
  Check,
  X,
  Network,
  Wifi,
  Router,
  Lock,
  Activity,
  Box,
  Waypoints,
  Globe,
  FileText,
  List,
  MapPin,
  Workflow,
  Radio,
  UserCircle,
  Route,
  Power,
  ShieldCheck,
  GitBranch,
  Package,
  Terminal,
  ArrowLeftRight,
  MonitorSpeaker,
  Zap,
  Clock,
  Bot,
  Gauge,
  FolderUp,
} from "lucide-react";
import { userManagementService, FeatureGroup, InstanceUserListItem } from "@/lib/api/user-management";
import { ApiError } from "@/lib/types/api";

interface ViewInstanceAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: {
    id: string;
    name: string;
    siteName: string;
  };
}

// Role badge styles
const ROLE_STYLES: Record<string, { bg: string; text: string; icon: any }> = {
  ADMIN: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", icon: Shield },
  OPERATOR: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", icon: Edit3 },
  VIEWER: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-400", icon: Eye },
};

// Feature icons mapping
const FEATURE_ICONS: Record<FeatureGroup, any> = {
  [FeatureGroup.FIREWALL]: Shield,
  [FeatureGroup.NAT]: Network,
  [FeatureGroup.NAT64]: Globe,
  [FeatureGroup.NAT66]: Globe,
  [FeatureGroup.SERVICE]: Package,
  [FeatureGroup.BROADCAST_RELAY]: Radio,
  [FeatureGroup.CONFIG_SYNC]: RefreshCw,
  [FeatureGroup.CONNTRACK_SYNC]: ArrowLeftRight,
  [FeatureGroup.CONSOLE_SERVER]: MonitorSpeaker,
  [FeatureGroup.DHCP_RELAY]: Network,
  [FeatureGroup.DHCPV6_RELAY]: Network,
  [FeatureGroup.DHCPV6_SERVER]: Server,
  [FeatureGroup.DNS_FORWARDING]: Globe,
  [FeatureGroup.DNS_DYNAMIC]: RefreshCw,
  [FeatureGroup.WEBPROXY]: Globe,
  [FeatureGroup.EVENT_HANDLER]: Zap,
  [FeatureGroup.HTTPS]: Lock,
  [FeatureGroup.IPOE_SERVER]: Wifi,
  [FeatureGroup.LLDP]: Network,
  [FeatureGroup.NDP_PROXY]: Network,
  [FeatureGroup.NTP]: Clock,
  [FeatureGroup.ROUTER_ADVERT]: Radio,
  [FeatureGroup.SALT_MINION]: Bot,
  [FeatureGroup.SERVICE_MONITORING]: Activity,
  [FeatureGroup.SLA]: Gauge,
  [FeatureGroup.SNMP]: Network,
  [FeatureGroup.SSH]: Terminal,
  [FeatureGroup.TFTP_SERVER]: FolderUp,
  [FeatureGroup.QOS]: Gauge,
  [FeatureGroup.CONTAINER]: Box,
  [FeatureGroup.DHCP]: Wifi,
  [FeatureGroup.INTERFACES]: Router,
  [FeatureGroup.FIREWALL_GROUPS]: Shield,
  [FeatureGroup.FIREWALL_POLICIES]: Shield,
  [FeatureGroup.FIREWALL_ZONES]: Shield,
  [FeatureGroup.FIREWALL_GLOBAL_OPTIONS]: Shield,
  [FeatureGroup.FIREWALL_BRIDGE]: Shield,
  [FeatureGroup.FIREWALL_FLOWTABLES]: Shield,
  [FeatureGroup.NETWORK]: Network,
  [FeatureGroup.VRF]: Network,
  [FeatureGroup.LOAD_BALANCING]: Network,
  [FeatureGroup.VPN]: Lock,
  [FeatureGroup.IPSEC]: Lock,
  [FeatureGroup.WIREGUARD]: Lock,
  [FeatureGroup.L2TP]: Lock,
  [FeatureGroup.OPENVPN]: Lock,
  [FeatureGroup.PPPOE]: Lock,
  [FeatureGroup.SSTPC]: Lock,
  [FeatureGroup.PKI]: ShieldCheck,
  [FeatureGroup.ROUTING]: Router,
  [FeatureGroup.UNICAST_PROTOCOLS]: Router,
  [FeatureGroup.BGP]: Router,
  [FeatureGroup.OSPF]: Router,
  [FeatureGroup.OSPFV3]: Router,
  [FeatureGroup.ISIS]: Router,
  [FeatureGroup.OPENFABRIC]: Router,
  [FeatureGroup.RIP]: Router,
  [FeatureGroup.RIPNG]: Router,
  [FeatureGroup.BABEL]: Router,
  [FeatureGroup.STATIC_ROUTES]: Router,
  [FeatureGroup.FAILOVER]: Router,
  [FeatureGroup.ROUTING_INFRASTRUCTURE]: Router,
  [FeatureGroup.BFD]: Activity,
  [FeatureGroup.MPLS]: Box,
  [FeatureGroup.SEGMENT_ROUTING]: Waypoints,
  [FeatureGroup.NHRP]: Globe,
  [FeatureGroup.RPKI]: Shield,
  [FeatureGroup.TRAFFIC_ENGINEERING]: GitBranch,
  [FeatureGroup.ROUTING_POLICIES]: FileText,
  [FeatureGroup.ACCESS_LIST]: List,
  [FeatureGroup.PREFIX_LIST]: List,
  [FeatureGroup.ROUTE_POLICY]: FileText,
  [FeatureGroup.ROUTE_MAP]: MapPin,
  [FeatureGroup.LOCAL_ROUTE]: Router,
  [FeatureGroup.BGP_AS_PATH]: Workflow,
  [FeatureGroup.BGP_COMMUNITY]: Network,
  [FeatureGroup.BGP_EXTENDED_COMMUNITY]: Network,
  [FeatureGroup.BGP_LARGE_COMMUNITY]: Network,
  [FeatureGroup.MULTICAST]: Radio,
  [FeatureGroup.IGMP_PROXY]: Wifi,
  [FeatureGroup.PIM]: Radio,
  [FeatureGroup.PIM6]: Radio,
  [FeatureGroup.SYSTEM]: Server,
  [FeatureGroup.CONFIGURATION]: Server,
  [FeatureGroup.MONITORING]: Activity,
  [FeatureGroup.SSH_CONSOLE]: Terminal,
  [FeatureGroup.DASHBOARD]: Server,
  [FeatureGroup.SITES_INSTANCES]: Building2,
  [FeatureGroup.USER_MANAGEMENT]: UserCircle,
  [FeatureGroup.POWER]: Power,
  [FeatureGroup.HIGH_AVAILABILITY]: Shield,
  [FeatureGroup.VXLAN]: Network,
  [FeatureGroup.TUNNEL]: Waypoints,
  [FeatureGroup.BONDING]: Network,
  [FeatureGroup.BRIDGE]: Network,
  [FeatureGroup.DUMMY]: Network,
  [FeatureGroup.ETHERNET]: Network,
  [FeatureGroup.VLAN]: Network,
  [FeatureGroup.GENEVE]: Network,
  [FeatureGroup.INPUT_IFACE]: Network,
  [FeatureGroup.LOOPBACK]: Router,
  [FeatureGroup.MACSEC]: Lock,
  [FeatureGroup.PSEUDO_ETHERNET]: Network,
  [FeatureGroup.VIRTUAL_ETHERNET]: Network,
  [FeatureGroup.VPP]: Network,
  [FeatureGroup.VTI]: Lock,
  [FeatureGroup.WIRELESS]: Wifi,
  [FeatureGroup.WWAN]: Wifi,
};

// Feature display names
const FEATURE_NAMES: Record<FeatureGroup, string> = {
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
  [FeatureGroup.WEBPROXY]: "Web Proxy",
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
  [FeatureGroup.TFTP_SERVER]: "TFTP Server",
  [FeatureGroup.QOS]: "QoS",
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

export function ViewInstanceAccessModal({
  open,
  onOpenChange,
  instance,
}: ViewInstanceAccessModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<InstanceUserListItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<InstanceUserListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadInstanceUsers();
      setSearchQuery("");
      setExpandedUserId(null);
    }
  }, [open, instance.id]);

  useEffect(() => {
    // Filter users based on search query
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (user) =>
            user.user_name?.toLowerCase().includes(query) ||
            user.user_email.toLowerCase().includes(query) ||
            user.role.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, users]);

  const loadInstanceUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await userManagementService.getInstanceUsers(instance.id);
      setUsers(data);
      setFilteredUsers(data);
    } catch (err) {
      setError((err as ApiError).message || "Failed to load instance users");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const toggleUserExpand = (userId: string) => {
    setExpandedUserId(expandedUserId === userId ? null : userId);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[500px] p-0 flex flex-col">
        {/* Sticky Header */}
        <div className="px-6 py-4 border-b bg-background sticky top-0 z-10">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Server className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-lg font-semibold">{instance.name}</div>
                <div className="text-sm text-muted-foreground font-normal flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {instance.siteName}
                </div>
              </div>
            </SheetTitle>
          </SheetHeader>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Stats */}
          {!loading && !error && (
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {filteredUsers.length} {filteredUsers.length === 1 ? "user" : "users"}
                {searchQuery && ` found`}
              </span>
              <Button onClick={loadInstanceUsers} variant="ghost" size="sm">
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Refresh
              </Button>
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-4">
            {/* Error message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-destructive mb-2">{error}</p>
                  <Button onClick={loadInstanceUsers} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {/* Loading state */}
            {loading && !error && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* User list */}
            {!loading && !error && (
              <>
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-border rounded-lg">
                    <User className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? "No users found matching your search" : "No users have access to this instance"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredUsers.map((user) => {
                      const roleStyle = ROLE_STYLES[user.role] || ROLE_STYLES.VIEWER;
                      const RoleIcon = roleStyle.icon;
                      const isExpanded = expandedUserId === user.user_id;

                      return (
                        <div
                          key={user.user_id}
                          className="border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors"
                        >
                          {/* User header - clickable */}
                          <button
                            onClick={() => toggleUserExpand(user.user_id)}
                            className="w-full p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left"
                          >
                            {/* Expand icon */}
                            <div className="flex-shrink-0">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>

                            {/* Avatar */}
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium text-primary">
                                {user.user_name?.charAt(0).toUpperCase() || user.user_email.charAt(0).toUpperCase()}
                              </span>
                            </div>

                            {/* User info */}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-foreground truncate">
                                {user.user_name || "Unnamed User"}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {user.user_email}
                              </div>
                            </div>

                            {/* Role badge */}
                            <Badge
                              variant="secondary"
                              className={`${roleStyle.bg} ${roleStyle.text} border-0 flex-shrink-0`}
                            >
                              <RoleIcon className="h-3 w-3 mr-1" />
                              {user.role}
                            </Badge>
                          </button>

                          {/* Expanded details */}
                          {isExpanded && (
                            <div className="border-t border-border bg-muted/30 p-4">
                              {user.role === "ADMIN" ? (
                                <div className="flex items-start gap-3">
                                  <div className="h-8 w-8 rounded-md bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                                    <Shield className="h-4 w-4 text-red-700 dark:text-red-400" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-sm text-foreground mb-1">
                                      Full Administrator Access
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      This user has complete access to all features and settings on this instance.
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Feature Permissions
                                  </div>
                                  {user.feature_permissions && user.feature_permissions.length > 0 ? (
                                    <div className="space-y-2">
                                      {user.feature_permissions.map((perm) => {
                                        const FeatureIcon = FEATURE_ICONS[perm.feature];
                                        const featureName = FEATURE_NAMES[perm.feature];

                                        return (
                                          <div
                                            key={perm.feature}
                                            className="flex items-center justify-between p-2 rounded-md bg-background border border-border"
                                          >
                                            <div className="flex items-center gap-2">
                                              <FeatureIcon className="h-4 w-4 text-muted-foreground" />
                                              <span className="text-sm font-medium">{featureName}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              {perm.can_edit ? (
                                                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                                                  <Edit3 className="h-3 w-3 mr-1" />
                                                  Edit
                                                </Badge>
                                              ) : perm.can_view ? (
                                                <Badge variant="outline" className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700">
                                                  <Eye className="h-3 w-3 mr-1" />
                                                  View
                                                </Badge>
                                              ) : (
                                                <Badge variant="outline" className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
                                                  <X className="h-3 w-3 mr-1" />
                                                  No Access
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground italic">
                                      No specific feature permissions configured
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
