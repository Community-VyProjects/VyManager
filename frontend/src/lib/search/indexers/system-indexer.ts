import { systemSettingsService } from "@/lib/api/system-settings";
import { containerService } from "@/lib/api/container";
import { Server, Box } from "lucide-react";
import { buildHref, createSearchResult, safeIndex } from "../utils";
import type { SearchIndexer, SearchResult } from "../types";

const FEATURE = "System";
const FEATURE_CONTAINERS = "Containers";

export const systemIndexer: SearchIndexer = {
  id: "system",
  index: async () => {
    const [system, containers] = await Promise.all([
      safeIndex("system-settings", async () => {
        const config = await systemSettingsService.getConfig();
        const results: SearchResult[] = [];

        config.static_host_mapping?.forEach((h) => {
          results.push(
            createSearchResult({
              id: `hostmap-${h.hostname}`,
              title: h.hostname,
              subtitle: "System · Host Mapping",
              description: `Host mapping · ${h.inet.join(", ")}${h.aliases?.length ? ` · aliases: ${h.aliases.join(", ")}` : ""}`,
              kind: "host-mapping",
              feature: FEATURE,
              subcategory: "System Settings · Host Mapping",
              href: buildHref("/system/settings", { tab: "hostmap" }),
              icon: Server,
              keywords: ["host", "mapping", h.hostname, ...h.inet, ...(h.aliases ?? [])],
              data: h,
            })
          );
        });

        config.login?.users?.forEach((u) => {
          results.push(
            createSearchResult({
              id: `system-user-${u.username}`,
              title: u.username,
              subtitle: "System · User",
              description: u.full_name || "System user account",
              kind: "system-user",
              feature: FEATURE,
              subcategory: "System Settings · Users & Login",
              href: buildHref("/system/settings", { tab: "users" }),
              icon: Server,
              keywords: ["user", "login", u.username, u.full_name ?? ""],
              data: u,
            })
          );

          u.ssh_keys.forEach((key) => {
            results.push(
              createSearchResult({
                id: `ssh-key-${u.username}-${key.key_name}`,
                title: key.key_name,
                subtitle: `System · SSH Key · ${u.username}`,
                description: key.key_type ? `${key.key_type} key for ${u.username}` : `SSH key for ${u.username}`,
                kind: "ssh-key",
                feature: FEATURE,
                subcategory: `Users · ${u.username}`,
                href: buildHref("/system/settings", { tab: "users" }),
                icon: Server,
                keywords: ["ssh", "key", u.username, key.key_name],
                data: { user: u.username, key },
              })
            );
          });
        });

        return results;
      }),

      safeIndex("containers", async () => {
        const config = await containerService.getConfig();
        const results: SearchResult[] = [];

        config.containers.forEach((c) => {
          results.push(
            createSearchResult({
              id: `container-${c.name}`,
              title: c.name,
              subtitle: "Containers · Running",
              description: [c.image, c.description].filter(Boolean).join(" · "),
              kind: "container",
              feature: FEATURE_CONTAINERS,
              subcategory: "Containers",
              href: buildHref("/system/containers", { tab: "running" }),
              icon: Box,
              keywords: ["container", c.name, c.image ?? ""],
              data: c,
            })
          );
        });

        config.registries.forEach((r) => {
          results.push(
            createSearchResult({
              id: `container-registry-${r.name}`,
              title: r.name,
              subtitle: "Containers · Registry",
              description: r.disabled ? "Registry (disabled)" : "Container image registry",
              kind: "container-registry",
              feature: FEATURE_CONTAINERS,
              subcategory: "Containers · Images",
              href: buildHref("/system/containers", { tab: "images" }),
              icon: Box,
              keywords: ["registry", "image", r.name],
              data: r,
            })
          );
        });

        config.networks.forEach((n) => {
          results.push(
            createSearchResult({
              id: `container-network-${n.name}`,
              title: n.name,
              subtitle: "Containers · Network",
              description: n.description || "Container network",
              kind: "container-network",
              feature: FEATURE_CONTAINERS,
              subcategory: "Containers · Networks",
              href: buildHref("/system/containers", { tab: "networks" }),
              icon: Box,
              keywords: ["container", "network", n.name],
              data: n,
            })
          );
        });

        return results;
      }),
    ]);

    return [...system, ...containers];
  },
};
