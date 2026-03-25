"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSessionStore } from "@/store/session-store";
import { interfacesService, NetworkInterface } from "@/lib/api/interfaces";
import { dhcpService } from "@/lib/api/dhcp";
import { wireguardService } from "@/lib/api/wireguard";
import { firewallIPv4Service } from "@/lib/api/firewall-ipv4";
import { bgpService } from "@/lib/api/bgp";
import { ospfService } from "@/lib/api/ospf";
import { natService } from "@/lib/api/nat";
import { pkiService } from "@/lib/api/pki";
import { monitoringService } from "@/lib/api/monitoring";
import { systemService } from "@/lib/api/system";
import { navigation } from "@/lib/navigation";
import { Settings, Network, Shield, Route, Lock, Activity, Server, Database } from "lucide-react";

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'page' | 'subnet' | 'client' | 'interface' | 'peer' | 'rule' | 'mapping' | 'certificate' | 'route' | 'nat-rule';
  category: string;
  href?: string;
  data?: any;
  icon?: React.ComponentType<{ className?: string }>;
}

interface SearchContextType {
  searchResults: SearchResult[];
  isSearching: boolean;
  search: (query: string) => void;
  refreshIndex: () => Promise<void>;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

// Dynamic navigation items derived from sidebar definitions
const navigationItems: SearchResult[] = navigation.flatMap((item) => {
  const base: SearchResult[] = [];

  if (item.href) {
    base.push({
      id: `nav-${item.href}`,
      title: item.title,
      description: `${item.title} page`,
      type: 'page',
      category: item.title,
      href: item.href,
      icon: item.icon,
    });
  }

  if (item.children) {
    item.children.forEach((child) => {
      base.push({
        id: `nav-${child.href}`,
        title: child.title,
        description: `${child.title} settings page`,
        type: 'page',
        category: item.title,
        href: child.href,
        icon: item.icon,
      });
    });
  }

  return base;
});

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [indexedData, setIndexedData] = useState<SearchResult[]>([]);
  const { activeSession } = useSessionStore();

  // Index dynamic data from APIs
  const indexDynamicData = useCallback(async () => {
    if (!activeSession) return;

    const dynamicResults: SearchResult[] = [];

    try {
      // Index interfaces
      try {
        const interfaces = await interfacesService.getConfig();
        interfaces.interfaces.forEach((iface: NetworkInterface) => {
          dynamicResults.push({
            id: `interface-${iface.name}`,
            title: iface.name,
            description: `${iface.type} interface${iface.description ? ` - ${iface.description}` : ''}${iface.addresses.length > 0 ? ` (${iface.addresses.join(', ')})` : ''}`,
            type: 'interface',
            category: 'Network',
            data: iface,
            href: '/network/interfaces',
            icon: Network,
          });
        });
      } catch (error) {
        console.warn('Failed to index interfaces:', error);
      }

      // Index DHCP subnets
      try {
        const dhcpConfig = await dhcpService.getConfig();
        dhcpConfig.shared_networks.forEach((network) => {
          network.subnets.forEach((subnet) => {
            dynamicResults.push({
              id: `subnet-${subnet.subnet}`,
              title: subnet.subnet,
              description: `DHCP subnet with ${subnet.static_mappings.length} static mappings and ${subnet.ranges.length} ranges`,
              type: 'subnet',
              category: 'Network',
              data: { network, subnet },
              href: '/network/dhcp',
              icon: Network,
            });
          });
        });
      } catch (error) {
        console.warn('Failed to index DHCP subnets:', error);
      }

      // Index WireGuard peers
      try {
        const wgConfig = await wireguardService.getConfig();
        wgConfig.interfaces.forEach((iface) => {
          iface.peers.forEach((peer) => {
            dynamicResults.push({
              id: `peer-${iface.name}-${peer.name}`,
              title: peer.name,
              description: `WireGuard peer on ${iface.name}${peer.description ? ` - ${peer.description}` : ''}${peer.allowed_ips.length > 0 ? ` (allowed: ${peer.allowed_ips.join(', ')})` : ''}`,
              type: 'peer',
              category: 'VPN',
              data: { interface: iface, peer },
              href: '/vpn/wireguard',
              icon: Database,
            });
          });
        });
      } catch (error) {
        console.warn('Failed to index WireGuard peers:', error);
      }

      // Index firewall rules (simplified)
      try {
        const firewallConfig = await firewallIPv4Service.getConfig();
        Object.entries(firewallConfig).forEach(([key, rules]) => {
          if (Array.isArray(rules)) {
            rules.forEach((rule: any, index: number) => {
              if (rule.description || rule.action) {
                dynamicResults.push({
                  id: `firewall-rule-${key}-${index}`,
                  title: rule.description || `Rule ${rule.rule_number || index + 1}`,
                  description: `Firewall rule in ${key}: ${rule.action || 'unknown action'}`,
                  type: 'rule',
                  category: 'Firewall',
                  data: { ruleSet: key, rule, index },
                  href: '/firewall/policies',
                  icon: Shield,
                });
              }
            });
          }
        });
      } catch (error) {
        console.warn('Failed to index firewall rules:', error);
      }

      // Index BGP neighbors
      try {
        const bgpConfig = await bgpService.getConfig();
        if (bgpConfig.neighbors) {
          bgpConfig.neighbors.forEach((neighbor: any) => {
            dynamicResults.push({
              id: `bgp-neighbor-${neighbor.address}`,
              title: neighbor.address,
              description: `BGP neighbor${neighbor.description ? ` - ${neighbor.description}` : ''} (AS ${neighbor.remote_as})`,
              type: 'peer',
              category: 'Routing',
              data: neighbor,
              href: '/routing/unicast-protocols',
              icon: Route,
            });
          });
        }
      } catch (error) {
        console.warn('Failed to index BGP neighbors:', error);
      }

      // Index OSPF interfaces
      try {
        const ospfConfig = await ospfService.getConfig();
        if (ospfConfig.interfaces) {
          ospfConfig.interfaces.forEach((iface: any) => {
            dynamicResults.push({
              id: `ospf-interface-${iface.name}`,
              title: iface.name,
              description: `OSPF interface (area ${iface.area}, cost ${iface.cost || 'default'})`,
              type: 'interface',
              category: 'Routing',
              data: iface,
              href: '/network/interfaces',
              icon: Route,
            });
          });
        }
      } catch (error) {
        console.warn('Failed to index OSPF interfaces:', error);
      }

      // Index NAT rules
      try {
        const natConfig = await natService.getConfig();
        // Index source NAT rules
        if (natConfig.source_rules) {
          natConfig.source_rules.forEach((rule: any, index: number) => {
            dynamicResults.push({
              id: `nat-rule-source-${index}`,
              title: rule.description || `Source NAT Rule ${rule.rule_number}`,
              description: `Source NAT rule ${rule.rule_number}: ${rule.outbound_interface ? Object.values(rule.outbound_interface).join(', ') : 'no interface'}`,
              type: 'nat-rule',
              category: 'Network',
              data: { type: 'source', rule, index },
              icon: Network,
            });
          });
        }
        // Index destination NAT rules
        if (natConfig.destination_rules) {
          natConfig.destination_rules.forEach((rule: any, index: number) => {
            dynamicResults.push({
              id: `nat-rule-destination-${index}`,
              title: rule.description || `Destination NAT Rule ${rule.rule_number}`,
              description: `Destination NAT rule ${rule.rule_number}: ${rule.inbound_interface || 'no interface'}`,
              type: 'nat-rule',
              category: 'Network',
              data: { type: 'destination', rule, index },
              icon: Network,
            });
          });
        }
        // Index static NAT rules
        if (natConfig.static_rules) {
          natConfig.static_rules.forEach((rule: any, index: number) => {
            dynamicResults.push({
              id: `nat-rule-static-${index}`,
              title: rule.description || `Static NAT Rule ${rule.rule_number}`,
              description: `Static NAT rule ${rule.rule_number}: ${rule.inbound_interface || 'no interface'}`,
              type: 'nat-rule',
              category: 'Network',
              data: { type: 'static', rule, index },
              href: '/network/nat',
              icon: Network,
            });
          });
        }
      } catch (error) {
        console.warn('Failed to index NAT rules:', error);
      }

      // Index PKI certificates
      try {
        const pkiConfig = await pkiService.getConfig();
        if (pkiConfig.certificates) {
          pkiConfig.certificates.forEach((cert: any) => {
            dynamicResults.push({
              id: `certificate-${cert.name}`,
              title: cert.name,
              description: `PKI certificate${cert.description ? ` - ${cert.description}` : ''}`,
              type: 'certificate',
              category: 'PKI',
              data: cert,
              href: '/pki',
              icon: Shield,
            });
          });
        }
      } catch (error) {
        console.warn('Failed to index PKI certificates:', error);
      }

    } catch (error) {
      console.error('Error indexing dynamic data:', error);
    }

    setIndexedData([...navigationItems, ...dynamicResults]);
  }, [activeSession]);

  // Refresh index when session changes
  useEffect(() => {
    if (activeSession) {
      indexDynamicData();
    } else {
      setIndexedData(navigationItems);
    }
  }, [activeSession, indexDynamicData]);

  const search = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    // Simple text-based search
    const results = indexedData.filter(result =>
      result.title.toLowerCase().includes(query.toLowerCase()) ||
      result.description.toLowerCase().includes(query.toLowerCase()) ||
      result.category.toLowerCase().includes(query.toLowerCase()) ||
      result.type.toLowerCase().includes(query.toLowerCase())
    );

    // Sort by relevance (title matches first, then description)
    results.sort((a, b) => {
      const aTitle = a.title.toLowerCase().includes(query.toLowerCase());
      const bTitle = b.title.toLowerCase().includes(query.toLowerCase());

      if (aTitle && !bTitle) return -1;
      if (!aTitle && bTitle) return 1;

      // If both have title matches or both don't, sort by type (pages first)
      if (a.type === 'page' && b.type !== 'page') return -1;
      if (a.type !== 'page' && b.type === 'page') return 1;

      return 0;
    });

    setSearchResults(results.slice(0, 50)); // Limit to 50 results
    setIsSearching(false);
  }, [indexedData]);

  const refreshIndex = useCallback(async () => {
    await indexDynamicData();
  }, [indexDynamicData]);

  return (
    <SearchContext.Provider value={{
      searchResults,
      isSearching,
      search,
      refreshIndex,
    }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}