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
  indexedData: SearchResult[];
  searchResults: ScoredSearchResult[];
  isIndexing: boolean;
  indexReady: boolean;
  facets: ReturnType<typeof getIndexFacets>;
  favorites: string[];
  /** Prefer `runSearch` in UI — synchronous, no stale async updates */
  runSearch: (query: string, filters?: SearchFilters) => ScoredSearchResult[];
  refreshIndex: () => Promise<void>;
  toggleFavorite: (id: string) => void;
  getFavoriteResults: () => SearchResult[];
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [indexedData, setIndexedData] = useState<SearchResult[]>(navigationSearchIndex);
  const [searchResults, setSearchResults] = useState<ScoredSearchResult[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexReady, setIndexReady] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const { activeSession } = useSessionStore();

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  const facets = useMemo(() => getIndexFacets(indexedData), [indexedData]);

  const rebuildIndex = useCallback(async () => {
    const favs = loadFavorites();
    setFavorites(favs);
    const favSet = new Set(favs);

    if (!activeSession) {
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
  }, [activeSession]);

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
      setIndexedData((data) =>
        data.map((r) => ({ ...r, starred: next.includes(r.id) }))
      );
      return next;
    });
  }, []);

  const getFavoriteResults = useCallback(() => {
    return indexedData.filter((r) => favoriteSet.has(r.id));
  }, [indexedData, favoriteSet]);

  return (
    <SearchContext.Provider
      value={{
        indexedData,
        searchResults,
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
