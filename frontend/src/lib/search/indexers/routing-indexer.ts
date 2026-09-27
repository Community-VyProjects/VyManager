import { bgpService } from "@/lib/api/bgp";
import { ospfService } from "@/lib/api/ospf";
import { wireguardService } from "@/lib/api/wireguard";
import { Route, Database } from "lucide-react";
import { buildHref, buildLocalized, createSearchResult, safeIndex } from "../utils";
import type { SearchIndexer, SearchResult } from "../types";
import type { SearchI18n } from "../i18n";

const FEATURE_ROUTING = "Routing";
const FEATURE_VPN = "VPN";

function indexBgp(config: Awaited<ReturnType<typeof bgpService.getConfig>>, i18n: SearchI18n): SearchResult[] {
  const results: SearchResult[] = [];
  const l = i18n.label;

  config.neighbors?.forEach((neighbor) => {
    results.push(
      createSearchResult({
        id: `bgp-neighbor-${neighbor.address}`,
        title: neighbor.address,
        subtitle: `BGP · ${l("Neighbor")}`,
        description: [
          neighbor.description,
          `AS ${neighbor.remote_as}`,
          neighbor.peer_group ? i18n.t("routing.peerGroupPart", { group: neighbor.peer_group }) : null,
        ]
          .filter(Boolean)
          .join(" · "),
        kind: "bgp-neighbor",
        feature: FEATURE_ROUTING,
        subcategory: `BGP · ${l("Neighbors")}`,
        href: buildHref("/routing/unicast-protocols", {
          protocol: "bgp",
          tab: "neighbors",
        }),
        icon: Route,
        keywords: ["bgp", l("neighbor"), neighbor.address, neighbor.description ?? ""],
        data: neighbor,
      })
    );
  });

  config.peer_groups?.forEach((pg) => {
    results.push(
      createSearchResult({
        id: `bgp-peer-group-${pg.name}`,
        title: pg.name,
        subtitle: `BGP · ${l("Peer Group")}`,
        description: [pg.description, pg.remote_as ? `AS ${pg.remote_as}` : null]
          .filter(Boolean)
          .join(" · ") || i18n.t("routing.bgpPeerGroup"),
        kind: "bgp-peer-group",
        feature: FEATURE_ROUTING,
        subcategory: `BGP · ${l("Peer Groups")}`,
        href: buildHref("/routing/unicast-protocols", {
          protocol: "bgp",
          tab: "peer-groups",
        }),
        icon: Route,
        keywords: ["bgp", l("peer group"), pg.name],
        data: pg,
      })
    );
  });

  return results;
}

function indexOspf(config: Awaited<ReturnType<typeof ospfService.getConfig>>, i18n: SearchI18n): SearchResult[] {
  if (!config.interfaces) return [];
  return config.interfaces.map((iface) =>
    createSearchResult({
      id: `ospf-interface-${iface.name}`,
      title: iface.name,
      subtitle: `OSPF · ${i18n.label("Interface")}`,
      description: `${i18n.t("routing.ospfArea", { area: String(iface.area) })}${
        iface.cost != null ? ` · ${i18n.t("routing.ospfCost", { cost: String(iface.cost) })}` : ""
      }`,
      kind: "ospf-interface",
      feature: FEATURE_ROUTING,
      subcategory: "OSPF",
      href: buildHref("/routing/unicast-protocols", { protocol: "ospf" }),
      icon: Route,
      keywords: ["ospf", iface.name, String(iface.area)],
      data: iface,
    })
  );
}

function indexWireguard(
  config: Awaited<ReturnType<typeof wireguardService.getConfig>>,
  i18n: SearchI18n
): SearchResult[] {
  return config.interfaces.flatMap((iface) =>
    iface.peers.map((peer) =>
      createSearchResult({
        id: `wg-peer-${iface.name}-${peer.name}`,
        title: peer.name,
        subtitle: `WireGuard · ${iface.name}`,
        description: [
          peer.description,
          peer.allowed_ips.length
            ? i18n.t("routing.allowedIps", { ips: peer.allowed_ips.join(", ") })
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
        kind: "wireguard-peer",
        feature: FEATURE_VPN,
        subcategory: "WireGuard",
        href: "/vpn/wireguard",
        icon: Database,
        keywords: ["wireguard", i18n.label("peer"), iface.name, peer.name],
        data: { interface: iface, peer },
      })
    )
  );
}

export const routingIndexer: SearchIndexer = {
  id: "routing",
  index: async (i18n) => {
    const [bgp, ospf, wireguard] = await Promise.all([
      safeIndex("bgp", async () => {
        const config = await bgpService.getConfig();
        return buildLocalized(i18n, (l) => indexBgp(config, l));
      }),

      safeIndex("ospf", async () => {
        const config = await ospfService.getConfig();
        return buildLocalized(i18n, (l) => indexOspf(config, l));
      }),

      safeIndex("wireguard", async () => {
        const config = await wireguardService.getConfig();
        return buildLocalized(i18n, (l) => indexWireguard(config, l));
      }),
    ]);

    return [...bgp, ...ospf, ...wireguard];
  },
};
