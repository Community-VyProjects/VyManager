import { ethernetService } from "@/lib/api/ethernet";
import type { EthernetInterface } from "@/lib/api/types/ethernet";
import { showService, type InterfaceName } from "@/lib/api/show";
import { dhcpService } from "@/lib/api/dhcp";
import { natService } from "@/lib/api/nat";
import { vrfService } from "@/lib/api/vrf";
import { Network, Layers } from "lucide-react";
import { buildHref, buildLocalized, createSearchResult, safeIndex } from "../utils";
import type { SearchIndexer, SearchResult } from "../types";
import type { SearchI18n } from "../i18n";

const FEATURE_NETWORK = "Network";
const FEATURE_VRF = "VRF";

const VRF_TABS = [
  { id: "settings", label: "Settings" },
  { id: "static", label: "Static Routes" },
  { id: "ospf", label: "OSPF" },
  { id: "ospfv3", label: "OSPFv3" },
  { id: "isis", label: "IS-IS" },
  { id: "bgp", label: "BGP" },
  { id: "rpki", label: "RPKI" },
  { id: "failover", label: "Failover" },
  { id: "dhcp", label: "DHCP Server" },
  { id: "dhcpv6", label: "DHCPv6 Server" },
] as const;

function indexInterfaces(
  ethConfig: Awaited<ReturnType<typeof ethernetService.getConfig>>,
  allIfaces: Awaited<ReturnType<typeof showService.getAllInterfaces>>,
  i18n: SearchI18n
): SearchResult[] {
  const results: SearchResult[] = [];
  const seen = new Set<string>();
  const iface = i18n.label("Interface");

  const addIface = (name: string, type: string, description?: string, addresses?: string[]) => {
    if (seen.has(name)) return;
    seen.add(name);
    results.push(
      createSearchResult({
        id: `interface-${name}`,
        title: name,
        subtitle: description ? `${iface} · ${description}` : iface,
        description: [
          type,
          description,
          addresses?.length ? addresses.join(", ") : null,
        ]
          .filter(Boolean)
          .join(" · "),
        kind: "interface",
        feature: FEATURE_NETWORK,
        subcategory: i18n.nav("Interfaces"),
        href: buildHref("/network/interfaces", { type: type.toLowerCase() }),
        icon: Network,
        keywords: [name, type, description ?? "", i18n.label("interface"), "ethernet", "vlan"],
        data: { name, type, description },
      })
    );
  };

  ethConfig.interfaces.forEach((eth: EthernetInterface) => {
    addIface(eth.name, eth.type, eth.description ?? undefined, eth.addresses);
  });

  allIfaces.interfaces.forEach((entry: InterfaceName) => {
    const desc = (entry as InterfaceName & { description?: string }).description;
    addIface(entry.name, entry.type || "interface", desc);
  });

  return results;
}

function indexDhcp(config: Awaited<ReturnType<typeof dhcpService.getConfig>>, i18n: SearchI18n): SearchResult[] {
  const results: SearchResult[] = [];
  const l = i18n.label;

  for (const network of config.shared_networks) {
    for (const subnet of network.subnets) {
      results.push(
        createSearchResult({
          id: `dhcp-subnet-${subnet.subnet}`,
          title: subnet.subnet,
          subtitle: `DHCP · ${l("Subnet")} · ${network.name}`,
          description: i18n.t("network.dhcpSubnetDescription", {
            mappings: String(subnet.static_mappings.length),
            ranges: String(subnet.ranges.length),
          }),
          kind: "dhcp-subnet",
          feature: FEATURE_NETWORK,
          subcategory: `DHCP · ${l("Subnets")}`,
          href: buildHref("/network/dhcp", { section: "subnets" }),
          icon: Network,
          keywords: ["dhcp", l("subnet"), network.name],
          data: { network, subnet },
        })
      );

      for (const range of subnet.ranges) {
        results.push(
          createSearchResult({
            id: `dhcp-range-${subnet.subnet}-${range.range_id}`,
            title: range.range_id,
            subtitle: `DHCP · ${l("Range")} · ${subnet.subnet}`,
            description: [range.start, range.stop].filter(Boolean).join(" – ") || i18n.t("network.dhcpRange"),
            kind: "dhcp-range",
            feature: FEATURE_NETWORK,
            subcategory: `DHCP · ${l("Ranges")}`,
            href: buildHref("/network/dhcp", { section: "ranges" }),
            icon: Network,
            keywords: ["dhcp", l("range"), subnet.subnet, range.range_id],
            data: { subnet: subnet.subnet, range },
          })
        );
      }

      for (const mapping of subnet.static_mappings) {
        results.push(
          createSearchResult({
            id: `dhcp-static-${subnet.subnet}-${mapping.name}`,
            title: mapping.name,
            subtitle: `DHCP · ${l("Static Mapping")} · ${subnet.subnet}`,
            description: [mapping.ip_address, mapping.mac_address].filter(Boolean).join(" · "),
            kind: "dhcp-static",
            feature: FEATURE_NETWORK,
            subcategory: `DHCP · ${l("Static Mappings")}`,
            href: buildHref("/network/dhcp", { section: "static" }),
            icon: Network,
            keywords: ["dhcp", l("static"), mapping.name, mapping.mac_address ?? ""],
            data: { subnet: subnet.subnet, mapping },
          })
        );
      }
    }

    results.push(
      createSearchResult({
        id: `dhcp-server-${network.name}`,
        title: network.name,
        subtitle: `DHCP · ${l("Shared Network / Server")}`,
        description: i18n.t("network.dhcpServerDescription", {
          count: String(network.subnets.length),
          authoritative: String(network.authoritative),
        }),
        kind: "dhcp-subnet",
        feature: FEATURE_NETWORK,
        subcategory: `DHCP · ${l("Servers")}`,
        href: buildHref("/network/dhcp", { section: "servers" }),
        icon: Network,
        keywords: ["dhcp", l("server"), l("shared network"), network.name],
        data: network,
      })
    );
  }

  return results;
}

function indexNat(config: Awaited<ReturnType<typeof natService.getConfig>>, i18n: SearchI18n): SearchResult[] {
  const results: SearchResult[] = [];

  const addNatRule = (
    rule: { rule_number: number; description?: string | null },
    kind: "nat-source" | "nat-destination" | "nat-static",
    englishLabel: string,
    typeParam: string,
    extra: string
  ) => {
    const label = i18n.label(englishLabel);
    const number = String(rule.rule_number);
    results.push(
      createSearchResult({
        id: `nat-${typeParam}-${rule.rule_number}`,
        title: rule.description || `${label} ${number}`,
        subtitle: `NAT · ${label}`,
        description: `${i18n.t("network.natRuleDescription", { label, number })}${extra ? ` · ${extra}` : ""}`,
        kind,
        feature: FEATURE_NETWORK,
        subcategory: `NAT · ${label}`,
        href: buildHref("/network/nat", { type: typeParam }),
        icon: Network,
        keywords: ["nat", label, number, rule.description ?? "", typeParam],
        data: { type: typeParam, rule },
      })
    );
  };

  config.source_rules?.forEach((rule) => {
    const iface = rule.outbound_interface ? Object.values(rule.outbound_interface).join(", ") : "";
    addNatRule(rule, "nat-source", "Source NAT", "source", iface);
  });

  config.destination_rules?.forEach((rule) => {
    const iface =
      typeof rule.inbound_interface === "string"
        ? rule.inbound_interface
        : rule.inbound_interface
          ? Object.values(rule.inbound_interface).join(", ")
          : "";
    addNatRule(rule, "nat-destination", "Destination NAT", "destination", iface);
  });

  config.static_rules?.forEach((rule) => {
    const iface =
      typeof rule.inbound_interface === "string"
        ? rule.inbound_interface
        : "";
    addNatRule(rule, "nat-static", "Static NAT", "static", iface);
  });

  if (config.cgnat) {
    for (const pool of config.cgnat.external_pools) {
      results.push(
        createSearchResult({
          id: `nat-cgnat-ext-${pool.name}`,
          title: pool.name,
          subtitle: `NAT · CGNAT · ${i18n.label("External Pool")}`,
          description: i18n.t("network.cgnatExternalPoolDescription", { count: String(pool.ranges.length) }),
          kind: "nat-cgnat",
          feature: FEATURE_NETWORK,
          subcategory: "NAT · CGNAT",
          href: buildHref("/network/nat", { type: "cgnat" }),
          icon: Network,
          keywords: ["cgnat", "carrier", pool.name],
          data: pool,
        })
      );
    }
    for (const pool of config.cgnat.internal_pools) {
      results.push(
        createSearchResult({
          id: `nat-cgnat-int-${pool.name}`,
          title: pool.name,
          subtitle: `NAT · CGNAT · ${i18n.label("Internal Pool")}`,
          description: pool.ranges.length ? pool.ranges.join(", ") : i18n.t("network.cgnatInternalPool"),
          kind: "nat-cgnat",
          feature: FEATURE_NETWORK,
          subcategory: "NAT · CGNAT",
          href: buildHref("/network/nat", { type: "cgnat" }),
          icon: Network,
          keywords: ["cgnat", "internal", pool.name],
          data: pool,
        })
      );
    }
    for (const rule of config.cgnat.rules) {
      const number = String(rule.rule_number);
      results.push(
        createSearchResult({
          id: `nat-cgnat-rule-${rule.rule_number}`,
          title: i18n.t("network.cgnatRule", { number }),
          subtitle: "NAT · CGNAT",
          description: i18n.t("network.cgnatRuleDescription", { number }),
          kind: "nat-cgnat",
          feature: FEATURE_NETWORK,
          subcategory: "NAT · CGNAT",
          href: buildHref("/network/nat", { type: "cgnat" }),
          icon: Network,
          keywords: ["cgnat", number, rule.source_pool ?? "", rule.translation_pool ?? ""],
          data: rule,
        })
      );
    }
  }

  return results;
}

function indexVrf(config: Awaited<ReturnType<typeof vrfService.getConfig>>, i18n: SearchI18n): SearchResult[] {
  const results: SearchResult[] = [];

  for (const inst of config.instances) {
    results.push(
      createSearchResult({
        id: `vrf-${inst.name}`,
        title: inst.name,
        subtitle: `VRF · ${i18n.label("Instance")}`,
        description:
          inst.description ||
          (inst.table
            ? i18n.t("network.vrfInstanceTable", { table: String(inst.table) })
            : i18n.t("network.vrfInstance")),
        kind: "vrf-instance",
        feature: FEATURE_VRF,
        subcategory: `VRF · ${i18n.label("Instances")}`,
        href: buildHref("/network/vrf", { tab: "instances", vrf: inst.name }),
        icon: Layers,
        keywords: ["vrf", inst.name, inst.description ?? ""],
        data: inst,
      })
    );

    for (const tab of VRF_TABS) {
      const label = i18n.label(tab.label);
      results.push(
        createSearchResult({
          id: `vrf-${inst.name}-tab-${tab.id}`,
          title: label,
          subtitle: `VRF · ${inst.name}`,
          description: i18n.t("network.vrfTabDescription", { tab: label, vrf: inst.name }),
          kind: "vrf-tab",
          feature: FEATURE_VRF,
          subcategory: `VRF · ${inst.name}`,
          href: buildHref("/network/vrf", { vrf: inst.name, tab: tab.id }),
          icon: Layers,
          keywords: ["vrf", inst.name, label, tab.id],
          data: { vrf: inst.name, tab: tab.id },
        })
      );
    }
  }

  return results;
}

export const networkIndexer: SearchIndexer = {
  id: "network",
  index: async (i18n) => {
    const [interfaces, dhcp, nat, vrf] = await Promise.all([
      safeIndex("interfaces", async () => {
        const ethConfig = await ethernetService.getConfig();
        const allIfaces = await showService.getAllInterfaces();
        return buildLocalized(i18n, (l) => indexInterfaces(ethConfig, allIfaces, l));
      }),

      safeIndex("dhcp", async () => {
        const config = await dhcpService.getConfig();
        return buildLocalized(i18n, (l) => indexDhcp(config, l));
      }),

      safeIndex("nat", async () => {
        const config = await natService.getConfig();
        return buildLocalized(i18n, (l) => indexNat(config, l));
      }),

      safeIndex("vrf", async () => {
        const config = await vrfService.getConfig();
        return buildLocalized(i18n, (l) => indexVrf(config, l));
      }),
    ]);

    return [...interfaces, ...dhcp, ...nat, ...vrf];
  },
};
