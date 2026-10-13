"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useLocale, useMessages } from "next-intl";
import { useSessionStore } from "@/store/session-store";
import { buildNavigationIndex } from "@/lib/search/navigation-index";
import { buildDynamicSearchIndex } from "@/lib/search/indexers";
import { searchIndex, getIndexFacets } from "@/lib/search/engine";
import { dedupeSearchResults } from "@/lib/search/dedupe";
import { createSearchI18n, type SearchI18n } from "@/lib/search/i18n";
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
  /** Translations the index was built with (kind labels etc. for display) */
  i18n: SearchI18n;
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
  const locale = useLocale();
  const messages = useMessages();
  // Build per locale only: the messages object is re-created on every router.refresh(),
  // which must not trigger a full re-index (it refetches every config section).
  const i18n = useMemo(
    () => createSearchI18n(locale, { searchIndex: messages.searchIndex, navigation: messages.navigation }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- messages only change together with the locale
    [locale]
  );
  const navigationSearchIndex = useMemo(() => buildNavigationIndex(i18n), [i18n]);

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
      const dynamic = await buildDynamicSearchIndex(i18n);
      const combined = dedupeSearchResults([...navigationSearchIndex, ...dynamic]);
      setIndexedData(applyFavorites(combined, favSet));
    } catch (error) {
      console.error("Failed to build search index:", error);
      setIndexedData(applyFavorites(dedupeSearchResults(navigationSearchIndex), favSet));
    } finally {
      setIsIndexing(false);
      setIndexReady(true);
    }
  }, [instanceId, i18n, navigationSearchIndex]); // Stable: instance id string + per-locale index

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
        i18n,
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
