import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { navigation } from "@/lib/navigation";
import { navTitleKey } from "@/i18n/nav-title";
import enSearchIndex from "../../../messages/en/searchIndex.json";
import zhSearchIndex from "../../../messages/zh-CN/searchIndex.json";
import zhNavigation from "../../../messages/zh-CN/navigation.json";
import { createSearchI18n, englishSearchI18n } from "./i18n";
import { buildNavigationIndex } from "./navigation-index";
import { walkConfig } from "./config-walker";
import { searchIndex } from "./engine";
import { getResultTypeLabel, humanizeKind } from "./labels";

const zh = createSearchI18n("zh-CN", { searchIndex: zhSearchIndex, navigation: zhNavigation });
const enIndex = buildNavigationIndex();
const zhIndex = buildNavigationIndex(zh);

const ids = (query: string, index = zhIndex) => searchIndex(index, query).map((r) => r.id);

describe("localized navigation index", () => {
  it("keeps the English index unchanged", () => {
    const iface = enIndex.find((r) => r.id === "nav-/network/interfaces");
    assert.equal(iface?.title, "Interfaces");
    assert.equal(iface?.description, "Interfaces page");
    const section = enIndex.find((r) => r.id === "nav-section-routing-static-failover-static-routes");
    assert.equal(section?.title, "Static Routes");
    assert.equal(section?.subtitle, "Routing · Static & Failover · Static Routes");
    assert.equal(section?.description, "Manage static routes");
    const field = enIndex.find((r) => r.id === "ui-fw-global-all-ping");
    assert.equal(
      field?.description,
      "All Ping selector from ICMP Settings within Global Options from Firewall — Accept or reject all IPv4 ICMP echo requests"
    );
    assert.equal(field?.typeLabel, "Selector");
  });

  it("uses the same ids in every language (favorites are stored by id)", () => {
    assert.deepEqual(zhIndex.map((r) => r.id).sort(), enIndex.map((r) => r.id).sort());
  });

  it("translates static texts but keeps features as English ids", () => {
    const section = zhIndex.find((r) => r.id === "nav-section-routing-static-failover-static-routes");
    assert.equal(section?.title, "静态路由");
    assert.equal(section?.subtitle, "路由 · 静态路由与故障转移 · 静态路由");
    assert.equal(section?.description, "管理静态路由");
    assert.equal(section?.feature, "Static & Failover");
    const field = zhIndex.find((r) => r.id === "ui-fw-global-all-ping");
    assert.equal(field?.title, "所有 Ping");
    assert.equal(field?.typeLabel, "选择器");
  });

  it("finds results for Chinese queries", () => {
    assert.ok(ids("静态路由").includes("nav-section-routing-static-failover-static-routes"));
    assert.ok(ids("接口").includes("nav-/network/interfaces"));
    assert.ok(ids("防火墙").some((id) => id.startsWith("ui-fw-global-")));
    assert.ok(ids("连接超时").includes("nav-section-firewall-global-options-connection-timeouts"));
  });

  it("still finds results for English queries in the Chinese UI", () => {
    assert.ok(ids("static routes").includes("nav-section-routing-static-failover-static-routes"));
    assert.ok(ids("interfaces").includes("nav-/network/interfaces"));
    assert.ok(ids("all ping").includes("ui-fw-global-all-ping"));
  });

  it("translates kind labels", () => {
    assert.equal(humanizeKind("firewall-group"), "Firewall Group");
    assert.equal(humanizeKind("firewall-group", zh), "防火墙组");
    const entity = { ...enIndex[0], kind: "config-entity" as const, typeLabel: undefined, subcategory: undefined };
    assert.equal(getResultTypeLabel(entity), "Configuration");
    assert.equal(getResultTypeLabel(entity, zh), "配置");
  });
});

describe("localized config walker", () => {
  const data = { neighbors: [{ address: "192.0.2.1", remote_as: 65001, local_as: 65000 }], rules: [] };
  const options = { sourceId: "bgp", feature: "Routing", hrefBase: "/routing/unicast-protocols" };

  it("translates fixed labels and keeps config values", () => {
    const en = walkConfig(data, options);
    const cn = walkConfig(data, options, zh);
    assert.deepEqual(cn.map((r) => r.id), en.map((r) => r.id));
    const neighbor = cn.find((r) => r.title === "192.0.2.1");
    assert.equal(neighbor?.description, "远程 AS：65001 · 本地 AS：65000");
    assert.equal(neighbor?.typeLabel, "邻居");
    const enNeighbor = en.find((r) => r.title === "192.0.2.1");
    assert.equal(enNeighbor?.description, "Remote AS: 65001 · Local AS: 65000");
    const field = cn.find((r) => r.id === "cfg-bgp-field-neighbors-remote_as");
    assert.equal(field?.title, "远程 AS");
    assert.equal(field?.description, "设置项：单播协议 › 0 › 远程 AS");
  });
});

describe("searchIndex messages", () => {
  it("keys labels by navTitleKey(English label)", () => {
    for (const [key, value] of Object.entries(enSearchIndex.labels)) {
      assert.equal(navTitleKey(value), key, value);
    }
  });

  it("has an English description for every indexed navigation section, identical to lib/navigation.ts", () => {
    const sections = enSearchIndex.sections as Record<string, Record<string, string>>;
    for (const item of navigation) {
      if (item.applianceOnly) continue;
      const pages = [item, ...(item.children ?? [])];
      for (const page of pages) {
        for (const s of page.sections ?? []) {
          if (!s.description || s.title.toLowerCase() === page.title.toLowerCase()) continue;
          assert.equal(sections[navTitleKey(page.title)]?.[navTitleKey(s.id)], s.description, `${page.title}/${s.id}`);
        }
      }
    }
  });

  it("English build ignores message lookups (source strings are the English text)", () => {
    assert.equal(englishSearchI18n.label("Local AS"), "Local AS");
    assert.equal(englishSearchI18n.nav("Static & Failover"), "Static & Failover");
  });
});
