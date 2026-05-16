import { navigation, type NavItem, type NavSection } from "@/lib/navigation";
import { createSearchResult, buildHref } from "./utils";
import type { SearchResult } from "./types";
import type { ComponentType } from "react";
import { dedupeSearchResults } from "./dedupe";
import { uiFieldsSearchIndex } from "./ui-fields-registry";

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

const sectionToResult = (
  section: NavSection,
  parentTitle: string,
  parentIcon: ComponentType<{ className?: string }>,
  contextPath: string
): SearchResult => {
  const fullContext = buildContextPath(contextPath, section.title);
  const disambiguated = section.description?.includes("\n")
    ? section.description.split("\n")[0].trim()
    : fullContext;

  return createSearchResult({
    id: `nav-section-${pathSlug(contextPath)}-${section.id}`,
    title: section.title,
    subtitle: disambiguated,
    description: section.description?.replace(/\n/g, " · ") ?? `${section.title} in ${parentTitle}`,
    kind: "section",
    typeLabel: section.title,
    feature: parentTitle,
    category: parentTitle,
    subcategory: fullContext,
    href: buildHref(section.href, section.searchParams),
    icon: parentIcon,
    keywords: [contextPath, parentTitle, section.id, "navigation", "page", "tab", "section"],
  });
};

function indexNavItem(item: NavItem, parentFeature?: string): SearchResult[] {
  const results: SearchResult[] = [];
  const feature = parentFeature ?? item.title;

  if (item.href) {
    results.push(
      createSearchResult({
        id: `nav-${item.href}`,
        title: item.title,
        description: `${item.title} page`,
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
      results.push(sectionToResult(s, item.title, item.icon, item.title));
    }
  }

  if (item.children) {
    for (const child of item.children) {
      const childIcon = child.icon ?? item.icon;
      if (!child.searchOnly) {
        results.push(
          createSearchResult({
            id: `nav-${pathSlug(`${item.title}-${child.title}`)}-${child.href}`,
            title: child.title,
            description: `${child.title} settings`,
            kind: "page",
            feature: item.title,
            category: item.title,
            href: child.href,
            icon: childIcon,
            keywords: ["navigation", "page", child.title],
          })
        );
      }
      if (child.sections) {
        for (const s of child.sections) {
          if (isRedundantSection(s, child.title)) continue;
          results.push(
            sectionToResult(s, child.title, childIcon, `${item.title} · ${child.title}`)
          );
        }
      }
    }
  }

  return results;
}

/** Static navigation + section deep links — available without an active VyOS session */
export function buildNavigationIndex(): SearchResult[] {
  return dedupeSearchResults([
    ...navigation.flatMap((item) => indexNavItem(item)),
    ...uiFieldsSearchIndex,
  ]);
}

export const navigationSearchIndex = buildNavigationIndex();
