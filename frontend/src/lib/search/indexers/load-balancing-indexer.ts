import { lbService } from "@/lib/api/load-balancing";
import { Scale } from "lucide-react";
import { buildLocalized, createSearchResult, safeIndex } from "../utils";
import type { SearchIndexer, SearchResult } from "../types";
import type { SearchI18n } from "../i18n";

const FEATURE = "Load Balancing";

type ReverseProxy = NonNullable<Awaited<ReturnType<typeof lbService.getConfig>>["reverse_proxy"]>;

function indexHaproxy({ backends, services }: ReverseProxy, i18n: SearchI18n): SearchResult[] {
  const results: SearchResult[] = [];
  const l = i18n.label;

  for (const backend of backends) {
    results.push(
      createSearchResult({
        id: `haproxy-backend-${backend.name}`,
        title: backend.name,
        subtitle: `HAProxy · ${l("Backend")}`,
        description:
          backend.description ||
          i18n.t("loadBalancing.backendDescription", {
            servers: String(backend.servers.length),
            rules: String(backend.rules.length),
          }),
        kind: "haproxy-backend",
        feature: FEATURE,
        subcategory: `HAProxy · ${l("Backends")}`,
        href: `/load-balancing/haproxy/backend/${encodeURIComponent(backend.name)}`,
        icon: Scale,
        keywords: ["haproxy", l("backend"), backend.name],
        data: backend,
      })
    );

    for (const server of backend.servers) {
      results.push(
        createSearchResult({
          id: `haproxy-server-${backend.name}-${server.name}`,
          title: server.name,
          subtitle: `HAProxy · ${l("Server")} · ${backend.name}`,
          description: [server.address, server.port].filter(Boolean).join(":") || i18n.t("loadBalancing.backendServer"),
          kind: "haproxy-server",
          feature: FEATURE,
          subcategory: `${l("Backend")} · ${backend.name}`,
          href: `/load-balancing/haproxy/backend/${encodeURIComponent(backend.name)}`,
          icon: Scale,
          keywords: ["haproxy", l("server"), backend.name, server.name],
          data: { backend: backend.name, server },
        })
      );
    }

    for (const rule of backend.rules) {
      results.push(
        createSearchResult({
          id: `haproxy-backend-rule-${backend.name}-${rule.rule_id}`,
          title: rule.rule_id,
          subtitle: `HAProxy · ${l("Routing Rule")} · ${backend.name}`,
          description: rule.domain_name?.length
            ? i18n.t("loadBalancing.domains", { domains: rule.domain_name.join(", ") })
            : i18n.t("loadBalancing.backendRule"),
          kind: "haproxy-rule",
          feature: FEATURE,
          subcategory: `HAProxy · ${backend.name} · ${l("Rules")}`,
          href: `/load-balancing/haproxy/backend/${encodeURIComponent(backend.name)}`,
          icon: Scale,
          keywords: ["haproxy", l("rule"), backend.name, rule.rule_id, ...(rule.domain_name ?? [])],
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
        subtitle: `HAProxy · ${l("Service")}`,
        description:
          service.description ||
          i18n.t("loadBalancing.serviceDescription", { count: String(service.rules.length) }),
        kind: "haproxy-service",
        feature: FEATURE,
        subcategory: `HAProxy · ${l("Services")}`,
        href: `/load-balancing/haproxy/service/${encodeURIComponent(service.name)}`,
        icon: Scale,
        keywords: ["haproxy", l("service"), service.name],
        data: service,
      })
    );

    for (const rule of service.rules) {
      results.push(
        createSearchResult({
          id: `haproxy-service-rule-${service.name}-${rule.rule_id}`,
          title: rule.rule_id,
          subtitle: `HAProxy · ${l("Service Rule")} · ${service.name}`,
          description: rule.domain_name?.length
            ? i18n.t("loadBalancing.domains", { domains: rule.domain_name.join(", ") })
            : i18n.t("loadBalancing.serviceRule"),
          kind: "haproxy-rule",
          feature: FEATURE,
          subcategory: `HAProxy · ${service.name} · ${l("Rules")}`,
          href: `/load-balancing/haproxy/service/${encodeURIComponent(service.name)}`,
          icon: Scale,
          keywords: ["haproxy", l("rule"), service.name, rule.rule_id],
          data: { service: service.name, rule },
        })
      );
    }
  }

  return results;
}

export const loadBalancingIndexer: SearchIndexer = {
  id: "load-balancing",
  index: async (i18n) =>
    safeIndex("haproxy", async () => {
      const config = await lbService.getConfig();
      const reverseProxy = config.reverse_proxy;
      if (!reverseProxy) return [];
      return buildLocalized(i18n, (l) => indexHaproxy(reverseProxy, l));
    }),
};
