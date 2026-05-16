import type { SearchResult, SearchFilters, SearchQueryOptions, ScoredSearchResult } from "./types";

const DEFAULT_LIMIT = 30;

function matchesFilters(result: SearchResult, filters?: SearchFilters): boolean {
  if (!filters) return true;
  if (filters.features.length > 0 && !filters.features.includes(result.feature)) return false;
  if (filters.kinds.length > 0 && !filters.kinds.includes(result.kind)) return false;
  return true;
}

function scoreResult(result: SearchResult, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return result.starred ? 50 : 0;

  let score = 0;
  const title = result.title.toLowerCase();
  const subtitle = (result.subtitle ?? "").toLowerCase();
  const description = result.description.toLowerCase();
  const subcategory = (result.subcategory ?? "").toLowerCase();

  if (title === q) score += 120;
  else if (title.startsWith(q)) score += 70;
  else if (title.includes(q)) score += 45;

  if (subtitle === q) score += 55;
  else if (subtitle.includes(q)) score += 30;

  if (subcategory.includes(q)) score += 28;

  if (description.includes(q)) score += 18;

  for (const kw of result.keywords) {
    if (kw === q) score += 25;
    else if (kw.includes(q)) score += 8;
  }

  if (result.feature.toLowerCase().includes(q)) score += 12;
  if (result.category.toLowerCase().includes(q)) score += 10;
  if (result.kind.includes(q)) score += 6;

  if (result.starred) score += 15;

  if (title === q) {
    if (result.kind === "page") score += 40;
    else if (result.kind === "section") score += 20;
  }

  if (result.kind === "page" || result.kind === "section") score += 4;
  if (result.kind === "ui-field" && title.includes(q)) score += 25;

  return score;
}

export function searchIndex(
  index: SearchResult[],
  query: string,
  options: SearchQueryOptions = {}
): ScoredSearchResult[] {
  const q = query.trim().toLowerCase();
  const limit = options.limit ?? DEFAULT_LIMIT;

  let candidates = index.filter((r) => matchesFilters(r, options.filters));

  if (!q) {
    const starred = candidates.filter((r) => r.starred);
    return starred.slice(0, limit).map((r) => ({ ...r, score: 50 }));
  }

  const scored: ScoredSearchResult[] = [];
  for (const result of candidates) {
    const score = scoreResult(result, q);
    if (score > 0) scored.push({ ...result, score });
  }

  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return scored.slice(0, limit);
}

export function getIndexFacets(index: SearchResult[]): {
  features: string[];
  kinds: SearchResult["kind"][];
} {
  const features = new Set<string>();
  const kinds = new Set<SearchResult["kind"]>();
  for (const r of index) {
    features.add(r.feature);
    kinds.add(r.kind);
  }
  return {
    features: [...features].sort(),
    kinds: [...kinds].sort(),
  };
}
