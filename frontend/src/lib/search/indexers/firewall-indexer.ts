import { firewallIPv4Service } from "@/lib/api/firewall-ipv4";
import { firewallGroupsService } from "@/lib/api/firewall-groups";
import { firewallZonesService } from "@/lib/api/firewall-zones";
import { bridgeFirewallService } from "@/lib/api/firewall-bridge";
import { Shield } from "lucide-react";
import { buildHref, createSearchResult, safeIndex } from "../utils";
import type { SearchIndexer, SearchResult } from "../types";

const FEATURE = "Firewall";

function indexIpv4Rules(config: Awaited<ReturnType<typeof firewallIPv4Service.getConfig>>): SearchResult[] {
  const results: SearchResult[] = [];
  const baseChains = [
    { key: "forward" as const, label: "Forward" },
    { key: "input" as const, label: "Input" },
    { key: "output" as const, label: "Output" },
  ];

  for (const { key, label } of baseChains) {
    const chain = config[key];
    chain.rules.forEach((rule, index) => {
      const title = rule.description || `Rule ${rule.rule_number ?? index + 1}`;
      results.push(
        createSearchResult({
          id: `fw-ipv4-${key}-${rule.rule_number ?? index}`,
          title,
          subtitle: `Firewall · IPv4 · ${label}`,
          description: `${label} chain: ${rule.action ?? "action"}${rule.protocol ? ` · ${rule.protocol}` : ""}`,
          kind: "firewall-rule",
          feature: FEATURE,
          subcategory: `Policies · IPv4 · ${label}`,
          href: buildHref("/firewall/policies", { section: "ipv4" }),
          icon: Shield,
          keywords: [label, "ipv4", "policy", String(rule.rule_number), rule.action ?? ""],
          data: { chain: key, rule },
        })
      );
    });
  }

  for (const chain of config.custom_chains) {
    results.push(
      createSearchResult({
        id: `fw-custom-chain-${chain.name}`,
        title: chain.name,
        subtitle: "Firewall · Custom Chain",
        description: chain.description || `Custom chain with ${chain.rules.length} rules`,
        kind: "firewall-chain",
        feature: FEATURE,
        subcategory: "Custom Chains",
        href: buildHref("/firewall/policies", { section: "ipv4", chain: chain.name, custom: "1" }),
        icon: Shield,
        keywords: ["custom chain", chain.default_action ?? ""],
        data: chain,
      })
    );

    chain.rules.forEach((rule, index) => {
      const title = rule.description || `Rule ${rule.rule_number ?? index + 1}`;
      results.push(
        createSearchResult({
          id: `fw-custom-rule-${chain.name}-${rule.rule_number ?? index}`,
          title,
          subtitle: `Custom Chain · ${chain.name}`,
          description: `Rule in ${chain.name}: ${rule.action ?? "action"}`,
          kind: "firewall-rule",
          feature: FEATURE,
          subcategory: `Custom Chains · ${chain.name}`,
          href: buildHref("/firewall/policies", { section: "ipv4", chain: chain.name, custom: "1" }),
          icon: Shield,
          keywords: ["custom chain", chain.name, String(rule.rule_number)],
          data: { chain: chain.name, rule },
        })
      );
    });
  }

  return results;
}

function indexGroups(config: Awaited<ReturnType<typeof firewallGroupsService.getConfig>>): SearchResult[] {
  const results: SearchResult[] = [];
  const groupLists: Array<{ list: { name: string; type: string; description?: string | null; members: string[] }[]; label: string }> = [
    { list: config.address_groups, label: "Address Group" },
    { list: config.ipv6_address_groups, label: "IPv6 Address Group" },
    { list: config.network_groups, label: "Network Group" },
    { list: config.ipv6_network_groups, label: "IPv6 Network Group" },
    { list: config.port_groups, label: "Port Group" },
    { list: config.interface_groups, label: "Interface Group" },
    { list: config.mac_groups, label: "MAC Group" },
    { list: config.domain_groups, label: "Domain Group" },
    { list: config.remote_groups, label: "Remote Group" },
  ];

  for (const { list, label } of groupLists) {
    for (const group of list) {
      results.push(
        createSearchResult({
          id: `fw-group-${group.type}-${group.name}`,
          title: group.name,
          subtitle: `Firewall · ${label}`,
          description: group.description || `${label} with ${group.members.length} members`,
          kind: "firewall-group",
          feature: FEATURE,
          subcategory: `Groups · ${label}`,
          href: "/firewall/groups",
          icon: Shield,
          keywords: [label, group.type, ...group.members],
          data: group,
        })
      );
    }
  }
  return results;
}

export const firewallIndexer: SearchIndexer = {
  id: "firewall",
  index: async () => {
    const [ipv4, groups, zones, bridge] = await Promise.all([
      safeIndex("firewall-ipv4", async () => {
        const config = await firewallIPv4Service.getConfig();
        return indexIpv4Rules(config);
      }),
      safeIndex("firewall-groups", async () => {
        const config = await firewallGroupsService.getConfig();
        return indexGroups(config);
      }),
      safeIndex("firewall-zones", async () => {
        const config = await firewallZonesService.getConfig();
        return config.zones.map((zone) =>
          createSearchResult({
            id: `fw-zone-${zone.name}`,
            title: zone.name,
            subtitle: "Firewall · Zone",
            description: zone.description || `Zone · ${zone.interfaces?.length ?? 0} interfaces`,
            kind: "firewall-zone",
            feature: FEATURE,
            subcategory: "Zones",
            href: "/firewall/zones",
            icon: Shield,
            keywords: ["zone", zone.default_action ?? "", ...(zone.interfaces ?? [])],
            data: zone,
          })
        );
      }),
      safeIndex("firewall-bridge", async () => {
        const config = await bridgeFirewallService.getConfig();
        const allChains = [...config.chains, ...config.custom_chains];
        return allChains.flatMap((chain) => {
          const isCustom = config.custom_chains.some((c) => c.name === chain.name);
          return [
            createSearchResult({
              id: `fw-bridge-chain-${chain.name}`,
              title: chain.name,
              subtitle: isCustom ? "Firewall · Bridge · Custom Chain" : "Firewall · Bridge · Chain",
              description: chain.description || `Bridge chain · ${chain.rule_count} rules`,
              kind: "bridge-chain",
              feature: FEATURE,
              subcategory: "Bridge",
              href: "/firewall/bridge",
              icon: Shield,
              keywords: ["bridge", chain.name],
              data: chain,
            }),
            ...chain.rules.map((rule, index) =>
              createSearchResult({
                id: `fw-bridge-rule-${chain.name}-${rule.rule_number ?? index}`,
                title: rule.description || `Rule ${rule.rule_number ?? index + 1}`,
                subtitle: `Bridge · ${chain.name}`,
                description: `Bridge rule: ${rule.action ?? ""}`,
                kind: "firewall-rule",
                feature: FEATURE,
                subcategory: `Bridge · ${chain.name}`,
                href: "/firewall/bridge",
                icon: Shield,
                data: { chain: chain.name, rule },
              })
            ),
          ];
        });
      }),
    ]);

    return [...ipv4, ...groups, ...zones, ...bridge];
  },
};
