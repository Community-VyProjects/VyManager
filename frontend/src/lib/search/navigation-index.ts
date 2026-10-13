import { navigation, type NavItem, type NavSection } from "@/lib/navigation";
import { navTitleKey } from "@/i18n/nav-title";
import { createSearchResult, buildHref, buildLocalized } from "./utils";
import type { SearchResult } from "./types";
import type { ComponentType } from "react";
import { dedupeSearchResults } from "./dedupe";
import { buildUiFieldsSearchIndex } from "./ui-fields-registry";
import { englishSearchI18n, type SearchI18n } from "./i18n";

function pathSlug(path: string): string {
  return path
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function buildContextPath(contextPath: string, sectionTitle: string): string {
  if (!contextPath) return sectionTitle;
  const segments = contextPath.split(" · ").filter((s) => s.toLowerCase() !== sectionTitle.toLowerCase());
  const base = segments.join(" · ");
  return base ? `${base} · ${sectionTitle}` : sectionTitle;
}

/** Skip nav sections that only repeat the parent page name (same tab label) */
function isRedundantSection(section: NavSection, parentPageTitle: string): boolean {
  return section.title.toLowerCase().trim() === parentPageTitle.toLowerCase().trim();
}

/** Section descriptions are translated by `sections.<parent page key>.<section id key>` */
function sectionDescription(section: NavSection, parentTitle: string, i18n: SearchI18n): string | undefined {
  if (!section.description) return undefined;
  return i18n.text(`sections.${navTitleKey(parentTitle)}.${navTitleKey(section.id)}`, section.description);
}

const sectionToResult = (
  section: NavSection,
  parentTitle: string,
  parentIcon: ComponentType<{ className?: string }>,
  contextPath: string,
  i18n: SearchI18n
): SearchResult => {
  // contextPath stays English for the id; display strings are translated
  const title = i18n.label(section.title);
  const parent = i18n.nav(parentTitle);
  const localContext = contextPath.split(" · ").map(i18n.nav).join(" · ");
  const fullContext = buildContextPath(localContext, title);
  const description = sectionDescription(section, parentTitle, i18n);
  const disambiguated = description?.includes("\n")
    ? description.split("\n")[0].trim()
    : fullContext;

  return createSearchResult({
    id: `nav-section-${pathSlug(contextPath)}-${section.id}`,
    title,
    subtitle: disambiguated,
    description:
      description?.replace(/\n/g, " · ") ?? i18n.t("nav.sectionDescription", { title, parent }),
    kind: "section",
    typeLabel: title,
    feature: parentTitle,
    category: parentTitle,
    subcategory: fullContext,
    href: buildHref(section.href, section.searchParams),
    icon: parentIcon,
    keywords: [localContext, parent, section.id, "navigation", "page", "tab", "section"],
  });
};

function indexNavItem(item: NavItem, i18n: SearchI18n, parentFeature?: string): SearchResult[] {
  if (item.applianceOnly) return [];
  const results: SearchResult[] = [];
  const feature = parentFeature ?? item.title;

  if (item.href) {
    const title = i18n.nav(item.title);
    results.push(
      createSearchResult({
        id: `nav-${item.href}`,
        title,
        description: i18n.t("nav.pageDescription", { title }),
        kind: "page",
        feature,
        category: feature,
        href: item.href,
        icon: item.icon,
        keywords: ["navigation", "page"],
      })
    );
  }

  if (item.sections) {
    for (const s of item.sections) {
      if (isRedundantSection(s, item.title)) continue;
      results.push(sectionToResult(s, item.title, item.icon, item.title, i18n));
    }
  }

  if (item.children) {
    for (const child of item.children) {
      const childIcon = child.icon ?? item.icon;
      if (!child.searchOnly) {
        const title = i18n.nav(child.title);
        results.push(
          createSearchResult({
            id: `nav-${pathSlug(`${item.title}-${child.title}`)}-${child.href}`,
            title,
            description: i18n.t("nav.childDescription", { title }),
            kind: "page",
            feature: item.title,
            category: item.title,
            href: child.href,
            icon: childIcon,
            keywords: ["navigation", "page", title],
          })
        );
      }
      if (child.sections) {
        for (const s of child.sections) {
          if (isRedundantSection(s, child.title)) continue;
          results.push(
            sectionToResult(s, child.title, childIcon, `${item.title} · ${child.title}`, i18n)
          );
        }
      }
    }
  }

  return results;
}

/**
 * Static navigation + section deep links + UI fields — available without an
 * active VyOS session. Built per locale (see SearchContext).
 */
export function buildNavigationIndex(i18n: SearchI18n = englishSearchI18n): SearchResult[] {
  return dedupeSearchResults(
    buildLocalized(i18n, (l) => [
      ...navigation.flatMap((item) => indexNavItem(item, l)),
      ...buildUiFieldsSearchIndex(l),
    ])
  );
}
