import { bgpService } from "@/lib/api/bgp";
import { ospfService } from "@/lib/api/ospf";
import { wireguardService } from "@/lib/api/wireguard";
import { Route, Database } from "lucide-react";
import { buildHref, createSearchResult, safeIndex } from "../utils";
import type { SearchIndexer, SearchResult } from "../types";

const FEATURE_ROUTING = "Routing";
const FEATURE_VPN = "VPN";

export const routingIndexer: SearchIndexer = {
  id: "routing",
  index: async () => {
    const [bgp, ospf, wireguard] = await Promise.all([
      safeIndex("bgp", async () => {
        const config = await bgpService.getConfig();
        const results: SearchResult[] = [];

        config.neighbors?.forEach((neighbor) => {
          results.push(
            createSearchResult({
              id: `bgp-neighbor-${neighbor.address}`,
              title: neighbor.address,
              subtitle: "BGP · Neighbor",
              description: [
                neighbor.description,
                `AS ${neighbor.remote_as}`,
                neighbor.peer_group ? `group ${neighbor.peer_group}` : null,
              ]
                .filter(Boolean)
                .join(" · "),
              kind: "bgp-neighbor",
              feature: FEATURE_ROUTING,
              subcategory: "BGP · Neighbors",
              href: buildHref("/routing/unicast-protocols", {
                protocol: "bgp",
                tab: "neighbors",
              }),
              icon: Route,
              keywords: ["bgp", "neighbor", neighbor.address, neighbor.description ?? ""],
              data: neighbor,
            })
          );
        });

        config.peer_groups?.forEach((pg) => {
          results.push(
            createSearchResult({
              id: `bgp-peer-group-${pg.name}`,
              title: pg.name,
              subtitle: "BGP · Peer Group",
              description: [pg.description, pg.remote_as ? `AS ${pg.remote_as}` : null]
                .filter(Boolean)
                .join(" · ") || "BGP peer group",
              kind: "bgp-peer-group",
              feature: FEATURE_ROUTING,
              subcategory: "BGP · Peer Groups",
              href: buildHref("/routing/unicast-protocols", {
                protocol: "bgp",
                tab: "peer-groups",
              }),
              icon: Route,
              keywords: ["bgp", "peer group", pg.name],
              data: pg,
            })
          );
        });

        return results;
      }),

      safeIndex("ospf", async () => {
        const config = await ospfService.getConfig();
        if (!config.interfaces) return [];
        return config.interfaces.map((iface) =>
          createSearchResult({
            id: `ospf-interface-${iface.name}`,
            title: iface.name,
            subtitle: "OSPF · Interface",
            description: `Area ${iface.area}${iface.cost != null ? ` · cost ${iface.cost}` : ""}`,
            kind: "ospf-interface",
            feature: FEATURE_ROUTING,
            subcategory: "OSPF",
            href: buildHref("/routing/unicast-protocols", { protocol: "ospf" }),
            icon: Route,
            keywords: ["ospf", iface.name, String(iface.area)],
            data: iface,
          })
        );
      }),

      safeIndex("wireguard", async () => {
        const config = await wireguardService.getConfig();
        return config.interfaces.flatMap((iface) =>
          iface.peers.map((peer) =>
            createSearchResult({
              id: `wg-peer-${iface.name}-${peer.name}`,
              title: peer.name,
              subtitle: `WireGuard · ${iface.name}`,
              description: [
                peer.description,
                peer.allowed_ips.length ? `allowed: ${peer.allowed_ips.join(", ")}` : null,
              ]
                .filter(Boolean)
                .join(" · "),
              kind: "wireguard-peer",
              feature: FEATURE_VPN,
              subcategory: "WireGuard",
              href: "/vpn/wireguard",
              icon: Database,
              keywords: ["wireguard", "peer", iface.name, peer.name],
              data: { interface: iface, peer },
            })
          )
        );
      }),
    ]);

    return [...bgp, ...ospf, ...wireguard];
  },
};
