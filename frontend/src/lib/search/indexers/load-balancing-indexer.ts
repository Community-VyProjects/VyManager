import { lbService } from "@/lib/api/load-balancing";
import { Scale } from "lucide-react";
import { buildHref, createSearchResult, safeIndex } from "../utils";
import type { SearchIndexer, SearchResult } from "../types";

const FEATURE = "Load Balancing";

export const loadBalancingIndexer: SearchIndexer = {
  id: "load-balancing",
  index: async () =>
    safeIndex("haproxy", async () => {
      const config = await lbService.getConfig();
      if (!config.reverse_proxy) return [];

      const { backends, services } = config.reverse_proxy;
      const results: SearchResult[] = [];

      for (const backend of backends) {
        results.push(
          createSearchResult({
            id: `haproxy-backend-${backend.name}`,
            title: backend.name,
            subtitle: "HAProxy · Backend",
            description: backend.description || `${backend.servers.length} servers · ${backend.rules.length} rules`,
            kind: "haproxy-backend",
            feature: FEATURE,
            subcategory: "HAProxy · Backends",
            href: `/load-balancing/haproxy/backend/${encodeURIComponent(backend.name)}`,
            icon: Scale,
            keywords: ["haproxy", "backend", backend.name],
            data: backend,
          })
        );

        for (const server of backend.servers) {
          results.push(
            createSearchResult({
              id: `haproxy-server-${backend.name}-${server.name}`,
              title: server.name,
              subtitle: `HAProxy · Server · ${backend.name}`,
              description: [server.address, server.port].filter(Boolean).join(":") || "Backend server",
              kind: "haproxy-server",
              feature: FEATURE,
              subcategory: `Backend · ${backend.name}`,
              href: `/load-balancing/haproxy/backend/${encodeURIComponent(backend.name)}`,
              icon: Scale,
              keywords: ["haproxy", "server", backend.name, server.name],
              data: { backend: backend.name, server },
            })
          );
        }

        for (const rule of backend.rules) {
          results.push(
            createSearchResult({
              id: `haproxy-backend-rule-${backend.name}-${rule.rule_id}`,
              title: rule.rule_id,
              subtitle: `HAProxy · Routing Rule · ${backend.name}`,
              description: rule.domain_name?.length
                ? `Domains: ${rule.domain_name.join(", ")}`
                : "Backend routing rule",
              kind: "haproxy-rule",
              feature: FEATURE,
              subcategory: `HAProxy · ${backend.name} · Rules`,
              href: `/load-balancing/haproxy/backend/${encodeURIComponent(backend.name)}`,
              icon: Scale,
              keywords: ["haproxy", "rule", backend.name, rule.rule_id, ...(rule.domain_name ?? [])],
              data: { backend: backend.name, rule },
            })
          );
        }
      }

      for (const service of services) {
        results.push(
          createSearchResult({
            id: `haproxy-service-${service.name}`,
            title: service.name,
            subtitle: "HAProxy · Service",
            description: service.description || `${service.rules.length} routing rules`,
            kind: "haproxy-service",
            feature: FEATURE,
            subcategory: "HAProxy · Services",
            href: `/load-balancing/haproxy/service/${encodeURIComponent(service.name)}`,
            icon: Scale,
            keywords: ["haproxy", "service", service.name],
            data: service,
          })
        );

        for (const rule of service.rules) {
          results.push(
            createSearchResult({
              id: `haproxy-service-rule-${service.name}-${rule.rule_id}`,
              title: rule.rule_id,
              subtitle: `HAProxy · Service Rule · ${service.name}`,
              description: rule.domain_name?.length
                ? `Domains: ${rule.domain_name.join(", ")}`
                : "Service routing rule",
              kind: "haproxy-rule",
              feature: FEATURE,
              subcategory: `HAProxy · ${service.name} · Rules`,
              href: `/load-balancing/haproxy/service/${encodeURIComponent(service.name)}`,
              icon: Scale,
              keywords: ["haproxy", "rule", service.name, rule.rule_id],
              data: { service: service.name, rule },
            })
          );
        }
      }

      return results;
    }),
};
