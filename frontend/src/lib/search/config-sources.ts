import { haService } from "@/lib/api/high-availability";
import { firewallGlobalOptionsService } from "@/lib/api/firewall-global-options";
import { firewallIPv6Service } from "@/lib/api/firewall-ipv6";
import { flowtablesService } from "@/lib/api/firewall-flowtables";
import { accessListService } from "@/lib/api/access-list";
import { prefixListService } from "@/lib/api/prefix-list";
import { routeService } from "@/lib/api/route";
import { routeMapService } from "@/lib/api/route-map";
import { localRouteService } from "@/lib/api/local-route";
import { asPathListService } from "@/lib/api/as-path-list";
import { communityListService } from "@/lib/api/community-list";
import { extcommunityListService } from "@/lib/api/extcommunity-list";
import { largeCommunityListService } from "@/lib/api/large-community-list";
import { ipsecService } from "@/lib/api/ipsec";
import { l2tpService } from "@/lib/api/l2tp";
import { openvpnService } from "@/lib/api/openvpn";
import { staticRoutesService } from "@/lib/api/static-routes";
import { nat64Service } from "@/lib/api/nat64";
import { nat66Service } from "@/lib/api/nat66";
import { ospfService } from "@/lib/api/ospf";
import { ospfv3Service } from "@/lib/api/ospfv3";
import { isisService } from "@/lib/api/isis";
import { ripService } from "@/lib/api/rip";
import { ripNgService } from "@/lib/api/ripng";
import { babelService } from "@/lib/api/babel";
import { openfabricService } from "@/lib/api/openfabric";
import { bfdService } from "@/lib/api/bfd";
import { mplsService } from "@/lib/api/mpls";
import { nhrpService } from "@/lib/api/nhrp";
import { rpkiService } from "@/lib/api/rpki";
import { trafficEngineeringService } from "@/lib/api/traffic-engineering";
import { failoverService } from "@/lib/api/failover";
import { igmpProxyService } from "@/lib/api/igmp-proxy";
import { broadcastRelayService } from "@/lib/api/broadcast-relay";
import { bondingService } from "@/lib/api/bonding";
import { bridgeService } from "@/lib/api/bridge";
import { tunnelService } from "@/lib/api/tunnel";
import { vxlanService } from "@/lib/api/vxlan";
import { systemSettingsService } from "@/lib/api/system-settings";
import type { SearchEntityKind } from "./types";

export interface ConfigSourceDefinition {
  id: string;
  feature: string;
  hrefBase: string;
  fetch: () => Promise<unknown>;
  hrefParams?: (path: string[]) => Record<string, string>;
  kind?: SearchEntityKind;
}

function params(tab: string, extra?: Record<string, string>): Record<string, string> {
  return extra ? { tab, ...extra } : { tab };
}

function tabFromPath(path: string[], map: Record<string, string>, fallback: string): Record<string, string> {
  const joined = path.join(".").toLowerCase();
  for (const [needle, tab] of Object.entries(map)) {
    if (joined.includes(needle)) return params(tab);
  }
  return params(fallback);
}

export const configSources: ConfigSourceDefinition[] = [
  {
    id: "system-settings",
    feature: "System",
    hrefBase: "/system/settings",
    fetch: () => systemSettingsService.getConfig(),
    hrefParams: (path) => {
      const j = path.join(".").toLowerCase();
      if (j.includes("host")) return params("hostmap");
      if (j.includes("user") || j.includes("login")) return params("users");
      if (j.includes("syslog")) return params("syslog");
      if (j.includes("conntrack")) {
        if (j.includes("tcp")) return params("conntrack", { section: "tcp-settings" });
        if (j.includes("table") || j.includes("hash") || j.includes("size")) {
          return params("conntrack", { section: "table-sizes" });
        }
        return params("conntrack");
      }
      if (j.includes("advanced")) return params("advanced");
      return params("general");
    },
  },
  {
    id: "ha",
    feature: "High Availability",
    hrefBase: "/network/high-availability",
    fetch: () => haService.getConfig(),
    hrefParams: (path) =>
      tabFromPath(path, { sync_groups: "sync", virtual_servers: "vs", vrrp: "vrrp" }, "vrrp"),
  },
  {
    id: "firewall-global-options",
    feature: "Firewall",
    hrefBase: "/firewall/global-options",
    fetch: () => firewallGlobalOptionsService.getConfig(),
    hrefParams: (path) => {
      const s = path.join(".").toLowerCase();
      if (s.includes("timeout")) return { section: "connection-timeouts" };
      if (s.includes("state_policy")) return { section: "state-policies" };
      if (s.includes("bridged")) return { section: "bridged-traffic" };
      if (s.includes("redirect")) return { section: "icmp-redirects" };
      if (s.includes("src_route") || s.includes("source")) return { section: "source-routing" };
      if (s.includes("ping") || s.includes("icmp")) return { section: "icmp-settings" };
      return { section: "security-options" };
    },
  },
  {
    id: "firewall-ipv6",
    feature: "Firewall",
    hrefBase: "/firewall/policies",
    fetch: () => firewallIPv6Service.getConfig(),
    hrefParams: () => ({ section: "ipv6" }),
  },
  {
    id: "firewall-flowtables",
    feature: "Firewall",
    hrefBase: "/firewall/flowtables",
    fetch: () => flowtablesService.getConfig(),
  },
  {
    id: "access-list",
    feature: "Policies",
    hrefBase: "/policies/access-list",
    fetch: () => accessListService.getConfig(),
    hrefParams: (path) =>
      path.join(".").includes("ipv6") ? { section: "ipv6" } : { section: "ipv4" },
  },
  {
    id: "prefix-list",
    feature: "Policies",
    hrefBase: "/policies/prefix-list",
    fetch: () => prefixListService.getConfig(),
    hrefParams: (path) =>
      path.join(".").includes("ipv6") ? { section: "ipv6" } : { section: "ipv4" },
  },
  {
    id: "route-policy",
    feature: "Policies",
    hrefBase: "/policies/route",
    fetch: () => routeService.getConfig(),
    hrefParams: (path) =>
      path.join(".").includes("route6") || path.join(".").includes("ipv6")
        ? { section: "route6" }
        : { section: "route" },
  },
  {
    id: "route-map",
    feature: "Policies",
    hrefBase: "/policies/route-map",
    fetch: () => routeMapService.getConfig(),
  },
  {
    id: "local-route",
    feature: "Policies",
    hrefBase: "/policies/local-route",
    fetch: () => localRouteService.getConfig(),
    hrefParams: (path) =>
      path.join(".").includes("ipv6") ? { section: "ipv6" } : { section: "ipv4" },
  },
  {
    id: "bgp-as-path",
    feature: "Policies",
    hrefBase: "/policies/bgp-as",
    fetch: () => asPathListService.getConfig(),
  },
  {
    id: "bgp-community",
    feature: "Policies",
    hrefBase: "/policies/bgp-community",
    fetch: () => communityListService.getConfig(),
  },
  {
    id: "bgp-ext-community",
    feature: "Policies",
    hrefBase: "/policies/bgp-extended-community",
    fetch: () => extcommunityListService.getConfig(),
  },
  {
    id: "bgp-large-community",
    feature: "Policies",
    hrefBase: "/policies/bgp-large-community",
    fetch: () => largeCommunityListService.getConfig(),
  },
  {
    id: "ipsec",
    feature: "VPN",
    hrefBase: "/vpn/ipsec",
    fetch: () => ipsecService.getConfig(),
    hrefParams: (path) => {
      const j = path.join(".").toLowerCase();
      if (j.includes("ike")) return { tab: "ike" };
      if (j.includes("esp")) return { tab: "esp" };
      if (j.includes("remote")) return { tab: "ra" };
      if (j.includes("auth")) return { tab: "auth" };
      if (j.includes("pool")) return { tab: "pools" };
      if (j.includes("site")) return { tab: "s2s" };
      return { tab: "s2s" };
    },
  },
  {
    id: "l2tp",
    feature: "VPN",
    hrefBase: "/vpn/l2tp",
    fetch: () => l2tpService.getConfig(),
    hrefParams: (path) => tabFromPath(path, { user: "users", pool: "pools", radius: "radius", auth: "auth" }, "overview"),
  },
  {
    id: "openvpn",
    feature: "VPN",
    hrefBase: "/vpn/openvpn",
    fetch: () => openvpnService.getConfig(),
  },
  {
    id: "static-routes",
    feature: "Routing",
    hrefBase: "/routing/static-failover/static-routes",
    fetch: () => staticRoutesService.getConfig(),
    hrefParams: (path) => {
      const j = path.join(".").toLowerCase();
      if (j.includes("arp")) return { section: "arp" };
      if (j.includes("mroute") || j.includes("multicast")) return { section: "mroute" };
      if (j.includes("table")) return { section: "tables" };
      if (j.includes("neighbor")) return { section: "neighbor-proxy" };
      return { section: "routes" };
    },
  },
  {
    id: "nat64",
    feature: "Network",
    hrefBase: "/network/nat64",
    fetch: () => nat64Service.getConfig(),
  },
  {
    id: "nat66",
    feature: "Network",
    hrefBase: "/network/nat66",
    fetch: () => nat66Service.getConfig(),
  },
  {
    id: "ospf",
    feature: "Routing",
    hrefBase: "/routing/unicast-protocols",
    fetch: () => ospfService.getConfig(),
    hrefParams: () => ({ protocol: "ospf" }),
  },
  {
    id: "ospfv3",
    feature: "Routing",
    hrefBase: "/routing/unicast-protocols",
    fetch: () => ospfv3Service.getConfig(),
    hrefParams: () => ({ protocol: "ospfv3" }),
  },
  {
    id: "isis",
    feature: "Routing",
    hrefBase: "/routing/unicast-protocols",
    fetch: () => isisService.getConfig(),
    hrefParams: () => ({ protocol: "isis" }),
  },
  {
    id: "rip",
    feature: "Routing",
    hrefBase: "/routing/unicast-protocols",
    fetch: () => ripService.getConfig(),
    hrefParams: () => ({ protocol: "rip" }),
  },
  {
    id: "ripng",
    feature: "Routing",
    hrefBase: "/routing/unicast-protocols",
    fetch: () => ripNgService.getConfig(),
    hrefParams: () => ({ protocol: "ripng" }),
  },
  {
    id: "babel",
    feature: "Routing",
    hrefBase: "/routing/unicast-protocols",
    fetch: () => babelService.getConfig(),
    hrefParams: () => ({ protocol: "babel" }),
  },
  {
    id: "openfabric",
    feature: "Routing",
    hrefBase: "/routing/unicast-protocols",
    fetch: () => openfabricService.getConfig(),
    hrefParams: () => ({ protocol: "openfabric" }),
  },
  {
    id: "bfd",
    feature: "Routing",
    hrefBase: "/routing/infrastructure",
    fetch: () => bfdService.getConfig(),
    hrefParams: () => ({ section: "bfd" }),
  },
  {
    id: "mpls",
    feature: "Routing",
    hrefBase: "/routing/infrastructure",
    fetch: () => mplsService.getConfig(),
    hrefParams: () => ({ section: "mpls" }),
  },
  {
    id: "nhrp",
    feature: "Routing",
    hrefBase: "/routing/infrastructure",
    fetch: () => nhrpService.getConfig(),
    hrefParams: () => ({ section: "nhrp" }),
  },
  {
    id: "rpki",
    feature: "Routing",
    hrefBase: "/routing/infrastructure",
    fetch: () => rpkiService.getConfig(),
    hrefParams: () => ({ section: "rpki" }),
  },
  {
    id: "traffic-engineering",
    feature: "Routing",
    hrefBase: "/routing/infrastructure",
    fetch: () => trafficEngineeringService.getConfig(),
    hrefParams: () => ({ section: "traffic-engineering" }),
  },
  {
    id: "failover",
    feature: "Routing",
    hrefBase: "/routing/static-failover/failover",
    fetch: () => failoverService.getConfig(),
  },
  {
    id: "igmp-proxy",
    feature: "Routing",
    hrefBase: "/routing/multicast",
    fetch: () => igmpProxyService.getConfig(),
  },
  {
    id: "broadcast-relay",
    feature: "Service",
    hrefBase: "/service/broadcast-relay",
    fetch: () => broadcastRelayService.getConfig(),
  },
  {
    id: "bonding",
    feature: "Network",
    hrefBase: "/network/interfaces",
    fetch: () => bondingService.getConfig(),
    hrefParams: () => ({ type: "bonding" }),
  },
  {
    id: "bridge-if",
    feature: "Network",
    hrefBase: "/network/interfaces",
    fetch: () => bridgeService.getConfig(),
    hrefParams: () => ({ type: "bridge" }),
  },
  {
    id: "tunnel",
    feature: "Network",
    hrefBase: "/network/interfaces",
    fetch: () => tunnelService.getConfig(),
    hrefParams: () => ({ type: "tunnel" }),
  },
  {
    id: "vxlan",
    feature: "Network",
    hrefBase: "/network/interfaces",
    fetch: () => vxlanService.getConfig(),
    hrefParams: () => ({ type: "vxlan" }),
  },
];
