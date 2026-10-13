import { systemSettingsService } from "@/lib/api/system-settings";
import { containerService } from "@/lib/api/container";
import { Server, Box } from "lucide-react";
import { buildHref, buildLocalized, createSearchResult, safeIndex } from "../utils";
import type { SearchIndexer, SearchResult } from "../types";
import type { SearchI18n } from "../i18n";

const FEATURE = "System";
const FEATURE_CONTAINERS = "Containers";

function indexSystemSettings(
  config: Awaited<ReturnType<typeof systemSettingsService.getConfig>>,
  i18n: SearchI18n
): SearchResult[] {
  const results: SearchResult[] = [];
  const l = i18n.label;
  const system = i18n.nav(FEATURE);
  const systemSettings = l("System Settings");

  config.static_host_mapping?.forEach((h) => {
    const aliases = h.aliases?.length ? ` · ${i18n.t("system.aliases", { aliases: h.aliases.join(", ") })}` : "";
    results.push(
      createSearchResult({
        id: `hostmap-${h.hostname}`,
        title: h.hostname,
        subtitle: `${system} · ${l("Host Mapping")}`,
        description: `${i18n.t("system.hostMappingDescription", { addresses: h.inet.join(", ") })}${aliases}`,
        kind: "host-mapping",
        feature: FEATURE,
        subcategory: `${systemSettings} · ${l("Host Mapping")}`,
        href: buildHref("/system/settings", { tab: "hostmap" }),
        icon: Server,
        keywords: [l("host"), l("mapping"), h.hostname, ...h.inet, ...(h.aliases ?? [])],
        data: h,
      })
    );
  });

  config.login?.users?.forEach((u) => {
    results.push(
      createSearchResult({
        id: `system-user-${u.username}`,
        title: u.username,
        subtitle: `${system} · ${l("User")}`,
        description: u.full_name || i18n.t("system.userAccount"),
        kind: "system-user",
        feature: FEATURE,
        subcategory: `${systemSettings} · ${l("Users & Login")}`,
        href: buildHref("/system/settings", { tab: "users" }),
        icon: Server,
        keywords: [l("user"), l("login"), u.username, u.full_name ?? ""],
        data: u,
      })
    );

    u.ssh_keys.forEach((key) => {
      results.push(
        createSearchResult({
          id: `ssh-key-${u.username}-${key.key_name}`,
          title: key.key_name,
          subtitle: `${system} · ${l("SSH Key")} · ${u.username}`,
          description: key.key_type
            ? i18n.t("system.sshKeyTyped", { type: key.key_type, user: u.username })
            : i18n.t("system.sshKey", { user: u.username }),
          kind: "ssh-key",
          feature: FEATURE,
          subcategory: `${l("Users")} · ${u.username}`,
          href: buildHref("/system/settings", { tab: "users" }),
          icon: Server,
          keywords: ["ssh", l("key"), u.username, key.key_name],
          data: { user: u.username, key },
        })
      );
    });
  });

  return results;
}

function indexContainers(
  config: Awaited<ReturnType<typeof containerService.getConfig>>,
  i18n: SearchI18n
): SearchResult[] {
  const results: SearchResult[] = [];
  const l = i18n.label;
  const containers = i18n.nav(FEATURE_CONTAINERS);

  config.containers.forEach((c) => {
    results.push(
      createSearchResult({
        id: `container-${c.name}`,
        title: c.name,
        subtitle: `${containers} · ${l("Running")}`,
        description: [c.image, c.description].filter(Boolean).join(" · "),
        kind: "container",
        feature: FEATURE_CONTAINERS,
        subcategory: containers,
        href: buildHref("/system/containers", { tab: "running" }),
        icon: Box,
        keywords: [l("container"), c.name, c.image ?? ""],
        data: c,
      })
    );
  });

  config.registries.forEach((r) => {
    results.push(
      createSearchResult({
        id: `container-registry-${r.name}`,
        title: r.name,
        subtitle: `${containers} · ${l("Registry")}`,
        description: r.disabled ? i18n.t("system.registryDisabled") : i18n.t("system.registry"),
        kind: "container-registry",
        feature: FEATURE_CONTAINERS,
        subcategory: `${containers} · ${l("Images")}`,
        href: buildHref("/system/containers", { tab: "images" }),
        icon: Box,
        keywords: [l("registry"), l("image"), r.name],
        data: r,
      })
    );
  });

  config.networks.forEach((n) => {
    results.push(
      createSearchResult({
        id: `container-network-${n.name}`,
        title: n.name,
        subtitle: `${containers} · ${l("Network")}`,
        description: n.description || i18n.t("system.containerNetwork"),
        kind: "container-network",
        feature: FEATURE_CONTAINERS,
        subcategory: `${containers} · ${l("Networks")}`,
        href: buildHref("/system/containers", { tab: "networks" }),
        icon: Box,
        keywords: [l("container"), l("network"), n.name],
        data: n,
      })
    );
  });

  return results;
}

export const systemIndexer: SearchIndexer = {
  id: "system",
  index: async (i18n) => {
    const [system, containers] = await Promise.all([
      safeIndex("system-settings", async () => {
        const config = await systemSettingsService.getConfig();
        return buildLocalized(i18n, (l) => indexSystemSettings(config, l));
      }),

      safeIndex("containers", async () => {
        const config = await containerService.getConfig();
        return buildLocalized(i18n, (l) => indexContainers(config, l));
      }),
    ]);

    return [...system, ...containers];
  },
};
