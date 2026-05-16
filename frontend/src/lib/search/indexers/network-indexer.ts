import { ethernetService } from "@/lib/api/ethernet";
import type { EthernetInterface } from "@/lib/api/types/ethernet";
import { showService, type InterfaceName } from "@/lib/api/show";
import { dhcpService } from "@/lib/api/dhcp";
import { natService } from "@/lib/api/nat";
import { vrfService } from "@/lib/api/vrf";
import { Network, Layers } from "lucide-react";
import { buildHref, createSearchResult, safeIndex } from "../utils";
import type { SearchIndexer, SearchResult } from "../types";

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

export const networkIndexer: SearchIndexer = {
  id: "network",
  index: async () => {
    const [interfaces, dhcp, nat, vrf] = await Promise.all([
      safeIndex("interfaces", async () => {
        const results: SearchResult[] = [];
        const seen = new Set<string>();

        const addIface = (name: string, type: string, description?: string, addresses?: string[]) => {
          if (seen.has(name)) return;
          seen.add(name);
          results.push(
            createSearchResult({
              id: `interface-${name}`,
              title: name,
              subtitle: description ? `Interface · ${description}` : "Interface",
              description: [
                type,
                description,
                addresses?.length ? addresses.join(", ") : null,
              ]
                .filter(Boolean)
                .join(" · "),
              kind: "interface",
              feature: FEATURE_NETWORK,
              subcategory: "Interfaces",
              href: buildHref("/network/interfaces", { type: type.toLowerCase() }),
              icon: Network,
              keywords: [name, type, description ?? "", "interface", "ethernet", "vlan"],
              data: { name, type, description },
            })
          );
        };

        const ethConfig = await ethernetService.getConfig();
        ethConfig.interfaces.forEach((iface: EthernetInterface) => {
          addIface(iface.name, iface.type, iface.description ?? undefined, iface.addresses);
        });

        const allIfaces = await showService.getAllInterfaces();
        allIfaces.interfaces.forEach((iface: InterfaceName) => {
          const desc = (iface as InterfaceName & { description?: string }).description;
          addIface(iface.name, iface.type || "interface", desc);
        });

        return results;
      }),

      safeIndex("dhcp", async () => {
        const config = await dhcpService.getConfig();
        const results: SearchResult[] = [];

        for (const network of config.shared_networks) {
          for (const subnet of network.subnets) {
            results.push(
              createSearchResult({
                id: `dhcp-subnet-${subnet.subnet}`,
                title: subnet.subnet,
                subtitle: `DHCP · Subnet · ${network.name}`,
                description: `${subnet.static_mappings.length} static mappings · ${subnet.ranges.length} ranges`,
                kind: "dhcp-subnet",
                feature: FEATURE_NETWORK,
                subcategory: "DHCP · Subnets",
                href: buildHref("/network/dhcp", { section: "subnets" }),
                icon: Network,
                keywords: ["dhcp", "subnet", network.name],
                data: { network, subnet },
              })
            );

            for (const range of subnet.ranges) {
              results.push(
                createSearchResult({
                  id: `dhcp-range-${subnet.subnet}-${range.range_id}`,
                  title: range.range_id,
                  subtitle: `DHCP · Range · ${subnet.subnet}`,
                  description: [range.start, range.stop].filter(Boolean).join(" – ") || "DHCP range",
                  kind: "dhcp-range",
                  feature: FEATURE_NETWORK,
                  subcategory: "DHCP · Ranges",
                  href: buildHref("/network/dhcp", { section: "ranges" }),
                  icon: Network,
                  keywords: ["dhcp", "range", subnet.subnet, range.range_id],
                  data: { subnet: subnet.subnet, range },
                })
              );
            }

            for (const mapping of subnet.static_mappings) {
              results.push(
                createSearchResult({
                  id: `dhcp-static-${subnet.subnet}-${mapping.name}`,
                  title: mapping.name,
                  subtitle: `DHCP · Static Mapping · ${subnet.subnet}`,
                  description: [mapping.ip_address, mapping.mac_address].filter(Boolean).join(" · "),
                  kind: "dhcp-static",
                  feature: FEATURE_NETWORK,
                  subcategory: "DHCP · Static Mappings",
                  href: buildHref("/network/dhcp", { section: "static" }),
                  icon: Network,
                  keywords: ["dhcp", "static", mapping.name, mapping.mac_address ?? ""],
                  data: { subnet: subnet.subnet, mapping },
                })
              );
            }
          }

          results.push(
            createSearchResult({
              id: `dhcp-server-${network.name}`,
              title: network.name,
              subtitle: "DHCP · Shared Network / Server",
              description: `${network.subnets.length} subnets · authoritative: ${network.authoritative}`,
              kind: "dhcp-subnet",
              feature: FEATURE_NETWORK,
              subcategory: "DHCP · Servers",
              href: buildHref("/network/dhcp", { section: "servers" }),
              icon: Network,
              keywords: ["dhcp", "server", "shared network", network.name],
              data: network,
            })
          );
        }

        return results;
      }),

      safeIndex("nat", async () => {
        const config = await natService.getConfig();
        const results: SearchResult[] = [];

        const addNatRule = (
          rule: { rule_number: number; description?: string | null },
          kind: "nat-source" | "nat-destination" | "nat-static",
          label: string,
          typeParam: string,
          extra: string
        ) => {
          results.push(
            createSearchResult({
              id: `nat-${typeParam}-${rule.rule_number}`,
              title: rule.description || `${label} ${rule.rule_number}`,
              subtitle: `NAT · ${label}`,
              description: `${label} rule ${rule.rule_number}${extra ? ` · ${extra}` : ""}`,
              kind,
              feature: FEATURE_NETWORK,
              subcategory: `NAT · ${label}`,
              href: buildHref("/network/nat", { type: typeParam }),
              icon: Network,
              keywords: ["nat", label, String(rule.rule_number), rule.description ?? "", typeParam],
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
                subtitle: "NAT · CGNAT · External Pool",
                description: `CGNAT external pool · ${pool.ranges.length} ranges`,
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
                subtitle: "NAT · CGNAT · Internal Pool",
                description: pool.ranges.length ? pool.ranges.join(", ") : "CGNAT internal pool",
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
            results.push(
              createSearchResult({
                id: `nat-cgnat-rule-${rule.rule_number}`,
                title: `CGNAT Rule ${rule.rule_number}`,
                subtitle: "NAT · CGNAT",
                description: `CGNAT rule ${rule.rule_number}`,
                kind: "nat-cgnat",
                feature: FEATURE_NETWORK,
                subcategory: "NAT · CGNAT",
                href: buildHref("/network/nat", { type: "cgnat" }),
                icon: Network,
                keywords: ["cgnat", String(rule.rule_number), rule.source_pool ?? "", rule.translation_pool ?? ""],
                data: rule,
              })
            );
          }
        }

        return results;
      }),

      safeIndex("vrf", async () => {
        const config = await vrfService.getConfig();
        const results: SearchResult[] = [];

        for (const inst of config.instances) {
          results.push(
            createSearchResult({
              id: `vrf-${inst.name}`,
              title: inst.name,
              subtitle: "VRF · Instance",
              description: inst.description || `VRF instance${inst.table ? ` · table ${inst.table}` : ""}`,
              kind: "vrf-instance",
              feature: FEATURE_VRF,
              subcategory: "VRF · Instances",
              href: buildHref("/network/vrf", { tab: "instances", vrf: inst.name }),
              icon: Layers,
              keywords: ["vrf", inst.name, inst.description ?? ""],
              data: inst,
            })
          );

          for (const tab of VRF_TABS) {
            results.push(
              createSearchResult({
                id: `vrf-${inst.name}-tab-${tab.id}`,
                title: tab.label,
                subtitle: `VRF · ${inst.name}`,
                description: `${tab.label} for VRF ${inst.name}`,
                kind: "vrf-tab",
                feature: FEATURE_VRF,
                subcategory: `VRF · ${inst.name}`,
                href: buildHref("/network/vrf", { vrf: inst.name, tab: tab.id }),
                icon: Layers,
                keywords: ["vrf", inst.name, tab.label, tab.id],
                data: { vrf: inst.name, tab: tab.id },
              })
            );
          }
        }

        return results;
      }),
    ]);

    return [...interfaces, ...dhcp, ...nat, ...vrf];
  },
};
