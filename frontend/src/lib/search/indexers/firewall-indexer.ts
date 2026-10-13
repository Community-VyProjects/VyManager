import { firewallIPv4Service } from "@/lib/api/firewall-ipv4";
import { firewallGroupsService } from "@/lib/api/firewall-groups";
import { firewallZonesService } from "@/lib/api/firewall-zones";
import { bridgeFirewallService } from "@/lib/api/firewall-bridge";
import { Shield } from "lucide-react";
import { buildHref, buildLocalized, createSearchResult, safeIndex } from "../utils";
import type { SearchIndexer, SearchResult } from "../types";
import type { SearchI18n } from "../i18n";

const FEATURE = "Firewall";

function indexIpv4Rules(
  config: Awaited<ReturnType<typeof firewallIPv4Service.getConfig>>,
  i18n: SearchI18n
): SearchResult[] {
  const results: SearchResult[] = [];
  const firewall = i18n.nav(FEATURE);
  // Base chain names are VyOS keywords and stay English
  const baseChains = [
    { key: "forward" as const, label: "Forward" },
    { key: "input" as const, label: "Input" },
    { key: "output" as const, label: "Output" },
  ];

  for (const { key, label } of baseChains) {
    const chain = config[key];
    chain.rules.forEach((rule, index) => {
      const title = rule.description || i18n.t("rule", { number: String(rule.rule_number ?? index + 1) });
      const action = rule.action ?? i18n.t("firewall.actionFallback");
      results.push(
        createSearchResult({
          id: `fw-ipv4-${key}-${rule.rule_number ?? index}`,
          title,
          subtitle: `${firewall} · IPv4 · ${label}`,
          description: `${i18n.t("firewall.chainRuleDescription", { chain: label, action })}${rule.protocol ? ` · ${rule.protocol}` : ""}`,
          kind: "firewall-rule",
          feature: FEATURE,
          subcategory: `${i18n.nav("Policies")} · IPv4 · ${label}`,
          href: buildHref("/firewall/policies", { section: "ipv4" }),
          icon: Shield,
          keywords: [label, "ipv4", "policy", String(rule.rule_number), rule.action ?? ""],
          data: { chain: key, rule },
        })
      );
    });
  }

  const customChain = i18n.label("Custom Chain");
  const customChains = i18n.label("Custom Chains");
  for (const chain of config.custom_chains) {
    results.push(
      createSearchResult({
        id: `fw-custom-chain-${chain.name}`,
        title: chain.name,
        subtitle: `${firewall} · ${customChain}`,
        description:
          chain.description ||
          i18n.t("firewall.customChainDescription", { count: String(chain.rules.length) }),
        kind: "firewall-chain",
        feature: FEATURE,
        subcategory: customChains,
        href: buildHref("/firewall/policies", { section: "ipv4", chain: chain.name, custom: "1" }),
        icon: Shield,
        keywords: [i18n.label("custom chain"), chain.default_action ?? ""],
        data: chain,
      })
    );

    chain.rules.forEach((rule, index) => {
      const title = rule.description || i18n.t("rule", { number: String(rule.rule_number ?? index + 1) });
      results.push(
        createSearchResult({
          id: `fw-custom-rule-${chain.name}-${rule.rule_number ?? index}`,
          title,
          subtitle: `${customChain} · ${chain.name}`,
          description: i18n.t("firewall.customRuleDescription", {
            chain: chain.name,
            action: rule.action ?? i18n.t("firewall.actionFallback"),
          }),
          kind: "firewall-rule",
          feature: FEATURE,
          subcategory: `${customChains} · ${chain.name}`,
          href: buildHref("/firewall/policies", { section: "ipv4", chain: chain.name, custom: "1" }),
          icon: Shield,
          keywords: [i18n.label("custom chain"), chain.name, String(rule.rule_number)],
          data: { chain: chain.name, rule },
        })
      );
    });
  }

  return results;
}

function indexGroups(
  config: Awaited<ReturnType<typeof firewallGroupsService.getConfig>>,
  i18n: SearchI18n
): SearchResult[] {
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

  for (const { list, label: englishLabel } of groupLists) {
    const label = i18n.label(englishLabel);
    for (const group of list) {
      results.push(
        createSearchResult({
          id: `fw-group-${group.type}-${group.name}`,
          title: group.name,
          subtitle: `${i18n.nav(FEATURE)} · ${label}`,
          description:
            group.description ||
            i18n.t("firewall.groupDescription", { group: label, count: String(group.members.length) }),
          kind: "firewall-group",
          feature: FEATURE,
          subcategory: `${i18n.nav("Groups")} · ${label}`,
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

function indexZones(
  config: Awaited<ReturnType<typeof firewallZonesService.getConfig>>,
  i18n: SearchI18n
): SearchResult[] {
  return config.zones.map((zone) =>
    createSearchResult({
      id: `fw-zone-${zone.name}`,
      title: zone.name,
      subtitle: `${i18n.nav(FEATURE)} · ${i18n.label("Zone")}`,
      description:
        zone.description ||
        i18n.t("firewall.zoneDescription", { count: String(zone.interfaces?.length ?? 0) }),
      kind: "firewall-zone",
      feature: FEATURE,
      subcategory: i18n.nav("Zones"),
      href: "/firewall/zones",
      icon: Shield,
      keywords: [i18n.label("zone"), zone.default_action ?? "", ...(zone.interfaces ?? [])],
      data: zone,
    })
  );
}

function indexBridge(
  config: Awaited<ReturnType<typeof bridgeFirewallService.getConfig>>,
  i18n: SearchI18n
): SearchResult[] {
  const firewall = i18n.nav(FEATURE);
  const bridge = i18n.nav("Bridge");
  const allChains = [...config.chains, ...config.custom_chains];
  return allChains.flatMap((chain) => {
    const isCustom = config.custom_chains.some((c) => c.name === chain.name);
    return [
      createSearchResult({
        id: `fw-bridge-chain-${chain.name}`,
        title: chain.name,
        subtitle: `${firewall} · ${bridge} · ${i18n.label(isCustom ? "Custom Chain" : "Chain")}`,
        description:
          chain.description ||
          i18n.t("firewall.bridgeChainDescription", { count: String(chain.rule_count) }),
        kind: "bridge-chain",
        feature: FEATURE,
        subcategory: bridge,
        href: "/firewall/bridge",
        icon: Shield,
        keywords: [i18n.label("bridge"), chain.name],
        data: chain,
      }),
      ...chain.rules.map((rule, index) =>
        createSearchResult({
          id: `fw-bridge-rule-${chain.name}-${rule.rule_number ?? index}`,
          title: rule.description || i18n.t("rule", { number: String(rule.rule_number ?? index + 1) }),
          subtitle: `${bridge} · ${chain.name}`,
          description: i18n.t("firewall.bridgeRuleDescription", { action: rule.action ?? "" }),
          kind: "firewall-rule",
          feature: FEATURE,
          subcategory: `${bridge} · ${chain.name}`,
          href: "/firewall/bridge",
          icon: Shield,
          data: { chain: chain.name, rule },
        })
      ),
    ];
  });
}

export const firewallIndexer: SearchIndexer = {
  id: "firewall",
  index: async (i18n) => {
    const [ipv4, groups, zones, bridge] = await Promise.all([
      safeIndex("firewall-ipv4", async () => {
        const config = await firewallIPv4Service.getConfig();
        return buildLocalized(i18n, (l) => indexIpv4Rules(config, l));
      }),
      safeIndex("firewall-groups", async () => {
        const config = await firewallGroupsService.getConfig();
        return buildLocalized(i18n, (l) => indexGroups(config, l));
      }),
      safeIndex("firewall-zones", async () => {
        const config = await firewallZonesService.getConfig();
        return buildLocalized(i18n, (l) => indexZones(config, l));
      }),
      safeIndex("firewall-bridge", async () => {
        const config = await bridgeFirewallService.getConfig();
        return buildLocalized(i18n, (l) => indexBridge(config, l));
      }),
    ]);

    return [...ipv4, ...groups, ...zones, ...bridge];
  },
};
