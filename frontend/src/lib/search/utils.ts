import type { SearchResult, SearchEntityKind } from "./types";
import type { ComponentType } from "react";
import type { SearchI18n } from "./i18n";
import { humanizeKind } from "./labels";

export const buildHref = (href: string, params?: Record<string, string>): string => {
  if (!params) return href;
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v != null && v !== "")
  );
  if (Object.keys(filtered).length === 0) return href;
  const query = new URLSearchParams(filtered).toString();
  return query ? `${href}?${query}` : href;
};

export interface CreateSearchResultInput {
  id: string;
  title: string;
  description: string;
  kind: SearchEntityKind;
  feature: string;
  category?: string;
  subcategory?: string;
  subtitle?: string;
  typeLabel?: string;
  href?: string;
  keywords?: string[];
  data?: unknown;
  icon?: ComponentType<{ className?: string }>;
}

/** Build a normalized search result with merged keywords for matching */
export function createSearchResult(input: CreateSearchResultInput): SearchResult {
  const keywords = new Set<string>(
    [
      input.title,
      input.subtitle,
      input.description,
      input.feature,
      input.category,
      input.subcategory,
      input.kind,
      input.typeLabel,
      ...(input.keywords ?? []),
    ].filter(Boolean) as string[]
  );

  return {
    id: input.id,
    title: input.title,
    subtitle: input.subtitle ?? input.subcategory,
    description: input.description,
    kind: input.kind,
    typeLabel: input.typeLabel,
    feature: input.feature,
    category: input.category ?? input.feature,
    subcategory: input.subcategory,
    keywords: [...keywords].map((k) => k.toLowerCase()),
    href: input.href,
    data: input.data,
    icon: input.icon,
  };
}

/**
 * Run a pure builder in the UI language. In a translated UI it also runs in
 * English and keeps every English string (titles, labels, context) as extra
 * keywords, plus the translated feature and type, so both English and
 * translated queries match. Both runs see the same data, so rows line up by
 * position and have the same ids.
 */
export function buildLocalized(
  i18n: SearchI18n,
  build: (i18n: SearchI18n) => SearchResult[]
): SearchResult[] {
  const localized = build(i18n);
  if (!i18n.en) return localized;

  const english = build(i18n.en);
  if (english.length !== localized.length) return localized;

  return localized.map((result, i) => {
    const en = english[i];
    if (en.id !== result.id) return result;
    const extra = [i18n.nav(result.feature), i18n.nav(result.category), humanizeKind(result.kind, i18n)];
    const keywords = new Set([...result.keywords, ...extra.map((k) => k.toLowerCase()), ...en.keywords]);
    return { ...result, keywords: [...keywords] };
  });
}

export const safeIndex = async (
  label: string,
  fn: () => Promise<SearchResult[]>
): Promise<SearchResult[]> => {
  try {
    return await fn();
  } catch (error) {
    console.warn(`Search indexer [${label}] failed:`, error);
    return [];
  }
};
