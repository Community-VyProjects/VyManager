import type { SearchResult } from "./types";

/** Prefer the more specific / useful entry when several rows mean the same place */
function specificityScore(r: SearchResult): number {
  let score = 0;
  if (r.href?.includes("?")) score += 20;
  if (r.kind === "ui-field") score += 12;
  if (r.kind === "section") score += 8;
  if (r.kind === "page") score += 5;
  if (r.typeLabel && r.typeLabel !== "Configuration") score += 4;
  score += (r.href?.match(/&/g)?.length ?? 0) * 3;
  if (r.description.length > 24) score += 2;
  if (r.href) score += 1;
  return score;
}

function normalizeHref(href?: string): string {
  if (!href) return "";
  try {
    const url = new URL(href, "http://localhost");
    const params = [...url.searchParams.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    return params ? `${url.pathname}?${params}` : url.pathname;
  } catch {
    return href.split("#")[0] ?? href;
  }
}

/** Same destination + label in the same feature area */
function looseSignature(r: SearchResult): string {
  return `${normalizeHref(r.href)}|${r.title.toLowerCase().trim()}|${r.feature.toLowerCase()}`;
}

/** Stricter: same path + title even if query params differ (Custom Chains page vs tab) */
function loosePathSignature(r: SearchResult): string {
  if (!r.href) return `|${r.title.toLowerCase().trim()}|${r.feature.toLowerCase()}`;
  try {
    const path = new URL(r.href, "http://localhost").pathname;
    return `${path}|${r.title.toLowerCase().trim()}|${r.feature.toLowerCase()}`;
  } catch {
    return looseSignature(r);
  }
}

function pickBetter(a: SearchResult, b: SearchResult): SearchResult {
  return specificityScore(a) >= specificityScore(b) ? a : b;
}

function mergeByKey(
  results: SearchResult[],
  keyFn: (r: SearchResult) => string
): SearchResult[] {
  const map = new Map<string, SearchResult>();
  for (const r of results) {
    const key = keyFn(r);
    const existing = map.get(key);
    map.set(key, existing ? pickBetter(existing, r) : r);
  }
  return [...map.values()];
}

/**
 * Deduplicate search index rows:
 * 1. Unique ids
 * 2. Same path + title + feature (e.g. Custom Chains page vs section tab)
 * 3. Same full href + title + feature
 */
export function dedupeSearchResults(results: SearchResult[]): SearchResult[] {
  const byId = mergeByKey(results, (r) => r.id);
  const byPath = mergeByKey(byId, loosePathSignature);
  return mergeByKey(byPath, looseSignature);
}
