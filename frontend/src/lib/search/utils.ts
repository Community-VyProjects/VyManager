import type { SearchResult, SearchEntityKind } from "./types";
import type { ComponentType } from "react";

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
