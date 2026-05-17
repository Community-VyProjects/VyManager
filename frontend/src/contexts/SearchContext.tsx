"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useSessionStore } from "@/store/session-store";
import { navigationSearchIndex } from "@/lib/search/navigation-index";
import { buildDynamicSearchIndex } from "@/lib/search/indexers";
import { searchIndex, getIndexFacets } from "@/lib/search/engine";
import { dedupeSearchResults } from "@/lib/search/dedupe";
import type { SearchResult, SearchFilters, ScoredSearchResult } from "@/lib/search/types";

export type { SearchResult, SearchEntityKind, SearchFilters } from "@/lib/search/types";

const FAVORITES_KEY = "search:favorites";

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function applyFavorites(results: SearchResult[], favoriteIds: Set<string>): SearchResult[] {
  return results.map((r) => ({ ...r, starred: favoriteIds.has(r.id) }));
}

interface SearchContextType {
  isIndexing: boolean;
  indexReady: boolean;
  facets: ReturnType<typeof getIndexFacets>;
  favorites: string[];
  runSearch: (query: string, filters?: SearchFilters) => ScoredSearchResult[];
  refreshIndex: () => Promise<void>;
  toggleFavorite: (id: string) => void;
  getFavoriteResults: () => SearchResult[];
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [indexedData, setIndexedData] = useState<SearchResult[]>(navigationSearchIndex);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexReady, setIndexReady] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const { activeSession } = useSessionStore();

  // Use a stable primitive so the index only rebuilds when the actual instance
  // changes, not on every object-reference change from the session store.
  const instanceId = activeSession?.instance_id ?? null;

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  const facets = useMemo(() => getIndexFacets(indexedData), [indexedData]);

  const rebuildIndex = useCallback(async () => {
    const favs = loadFavorites();
    setFavorites(favs);
    const favSet = new Set(favs);

    if (!instanceId) {
      setIndexedData(applyFavorites(dedupeSearchResults(navigationSearchIndex), favSet));
      setIndexReady(true);
      return;
    }

    setIsIndexing(true);
    try {
      const dynamic = await buildDynamicSearchIndex();
      const combined = dedupeSearchResults([...navigationSearchIndex, ...dynamic]);
      setIndexedData(applyFavorites(combined, favSet));
    } catch (error) {
      console.error("Failed to build search index:", error);
      setIndexedData(applyFavorites(dedupeSearchResults(navigationSearchIndex), favSet));
    } finally {
      setIsIndexing(false);
      setIndexReady(true);
    }
  }, [instanceId]); // Stable string — only changes when instance actually changes

  useEffect(() => {
    setIndexReady(false);
    rebuildIndex();
  }, [rebuildIndex]);

  const runSearch = useCallback(
    (query: string, filters?: SearchFilters) => searchIndex(indexedData, query, { filters }),
    [indexedData]
  );

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      const nextSet = new Set(next);
      setIndexedData((data) => data.map((r) => ({ ...r, starred: nextSet.has(r.id) })));
      return next;
    });
  }, []);

  const getFavoriteResults = useCallback(() => {
    return indexedData.filter((r) => favoriteSet.has(r.id));
  }, [indexedData, favoriteSet]);

  return (
    <SearchContext.Provider
      value={{
        isIndexing,
        indexReady,
        facets,
        favorites,
        runSearch,
        refreshIndex: rebuildIndex,
        toggleFavorite,
        getFavoriteResults,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}
