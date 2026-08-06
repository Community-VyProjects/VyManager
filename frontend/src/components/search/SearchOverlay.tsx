"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Star, ArrowRight, Command, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSearch } from "@/contexts/SearchContext";
import { useUnifiedView } from "@/contexts/UnifiedViewContext";
import { SearchResultIcon } from "@/lib/search/icon-resolver";
import type { SearchResult, SearchEntityKind, SearchFilters, SearchColumn } from "@/lib/search/types";
import { getResultTypeLabel, humanizeKind } from "@/lib/search/labels";
import { getUnifiedViewSelection } from "@/lib/search/unified-view";

const FEATURE_COLORS: Record<string, string> = {
  Firewall: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/25",
  Network: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/25",
  Routing: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
  VPN: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/25",
  VRF: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/25",
  System: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/25",
  Containers: "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/25",
  "Load Balancing": "bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 border-cyan-500/25",
  PKI: "bg-teal-500/15 text-teal-800 dark:text-teal-200 border-teal-500/25",
  Policies: "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/25",
  "High Availability": "bg-pink-500/15 text-pink-800 dark:text-pink-200 border-pink-500/25",
  Service: "bg-lime-500/15 text-lime-800 dark:text-lime-200 border-lime-500/25",
  Monitoring: "bg-orange-500/15 text-orange-800 dark:text-orange-200 border-orange-500/25",
};

function navigateToResult(
  result: SearchResult,
  router: ReturnType<typeof useRouter>,
  openUnifiedView: (type: "subnet" | "client", data: unknown) => void
) {
  const unifiedView = getUnifiedViewSelection(result);
  if (unifiedView) {
    openUnifiedView(unifiedView.type, unifiedView.data);
    return;
  }

  if (result.href) {
    router.push(result.href);
    return;
  }
  const fallbacks: Partial<Record<SearchEntityKind, string>> = {
    interface: "/network/interfaces",
    "firewall-rule": "/firewall/policies",
    "pki-certificate": "/pki",
    "pki-dh": "/pki?tab=dh",
    "nat-source": "/network/nat?type=source",
    "nat-destination": "/network/nat?type=destination",
    "nat-static": "/network/nat?type=static",
    "nat-cgnat": "/network/nat?type=cgnat",
    "bgp-neighbor": "/routing/unicast-protocols?protocol=bgp&tab=neighbors",
    "bgp-peer-group": "/routing/unicast-protocols?protocol=bgp&tab=peer-groups",
    "vrf-instance": "/network/vrf",
    "wireguard-peer": "/vpn/wireguard",
    "dhcp-subnet": "/network/dhcp",
    "host-mapping": "/system/settings?tab=hostmap",
    "system-user": "/system/settings?tab=users",
    "config-entity": "/",
  };
  router.push(fallbacks[result.kind] ?? "/");
}

interface SearchOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchOverlay({ open, onOpenChange }: SearchOverlayProps) {
  const router = useRouter();
  const { openUnifiedView } = useUnifiedView();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [featureFilter, setFeatureFilter] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<SearchEntityKind | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<SearchColumn>>(
    () => new Set(["title", "context", "kind", "description"])
  );

  const { isIndexing, indexReady, facets, runSearch, toggleFavorite, getFavoriteResults } =
    useSearch();

  const filters: SearchFilters = useMemo(
    () => ({
      features: featureFilter ? [featureFilter] : [],
      kinds: kindFilter ? [kindFilter] : [],
    }),
    [featureFilter, kindFilter]
  );

  /** Synchronous search — avoids duplicate/stale rows from debounced context updates */
  const displayResults = useMemo(() => {
    if (query.trim()) return runSearch(query, filters);
    return getFavoriteResults().map((r) => ({ ...r, score: 50 }));
  }, [query, filters, runSearch, getFavoriteResults]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset search state when the overlay closes
      setQuery("");
      setSelectedIndex(-1);
      setFeatureFilter(null);
      setKindFilter(null);
    }
  }, [open]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      navigateToResult(result, router, openUnifiedView);
      close();
    },
    [router, close, openUnifiedView]
  );

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }

      if (displayResults.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i < displayResults.length - 1 ? i + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i > 0 ? i - 1 : displayResults.length - 1));
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        handleSelect(displayResults[selectedIndex]);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, displayResults, selectedIndex, close, handleSelect]);

  const toggleColumn = (col: SearchColumn) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(col)) {
        if (next.size > 1) next.delete(col);
      } else {
        next.add(col);
      }
      return next;
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 pt-[min(10vh,96px)]">
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-md animate-in fade-in duration-200"
        onClick={close}
        aria-hidden
      />

      <div className="relative z-10 flex w-full max-w-3xl max-h-[min(85vh,720px)] flex-col animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-2xl shadow-black/20 ring-1 ring-white/10">
          {/* Search input */}
          <div className="flex shrink-0 items-center gap-3 border-b border-border/60 px-4 py-3 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
            <Search className="h-5 w-5 shrink-0 text-primary" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(-1);
              }}
              placeholder="Search pages, rules, interfaces, NAT, BGP, HAProxy…"
              className="border-0 bg-transparent text-base shadow-none focus-visible:ring-0 h-11 px-0"
            />
            {isIndexing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
            <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
              esc
            </kbd>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={close}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Filters */}
          <div className="scrollbar-themed flex shrink-0 flex-wrap items-center gap-2 px-4 py-2 border-b border-border/40 bg-muted/30 max-h-24 overflow-y-auto">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mr-1">
              Filter
            </span>
            <button
              type="button"
              onClick={() => setFeatureFilter(null)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs border transition-colors",
                !featureFilter
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-accent"
              )}
            >
              All
            </button>
            {facets.features.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFeatureFilter(featureFilter === f ? null : f)}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs border transition-colors",
                  featureFilter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-accent"
                )}
              >
                {f}
              </button>
            ))}

            <select
              value={kindFilter ?? ""}
              onChange={(e) => setKindFilter((e.target.value || null) as SearchEntityKind | null)}
              className="ml-auto h-7 rounded-md border border-border bg-background px-2 text-xs"
            >
              <option value="">All types</option>
              {facets.kinds.map((k) => (
                <option key={k} value={k}>
                  {humanizeKind(k)}
                </option>
              ))}
            </select>
          </div>

          {/* Column toggles */}
          <div className="flex shrink-0 flex-wrap gap-1.5 px-4 py-1.5 border-b border-border/30 text-[11px]">
            <span className="text-muted-foreground mr-1 self-center">Columns:</span>
            {(["title", "context", "kind", "description"] as SearchColumn[]).map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => toggleColumn(col)}
                className={cn(
                  "rounded px-2 py-0.5 capitalize transition-colors",
                  visibleColumns.has(col)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {col}
              </button>
            ))}
          </div>

          {/* Scrollable results */}
          <div className="scrollbar-themed min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {!indexReady ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Building search index…
              </div>
            ) : displayResults.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {query.trim()
                  ? "No results found"
                  : "Start typing to find what you are looking for"}
              </div>
            ) : (
              <div className="p-2">
                {!query.trim() && (
                  <p className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    <Star className="h-3.5 w-3.5 text-amber-400" />
                    Starred
                  </p>
                )}
                {displayResults.map((result, index) => {
                  const isSelected = index === selectedIndex;
                  const color =
                    FEATURE_COLORS[result.feature] ??
                    "bg-muted text-muted-foreground border-border";

                  return (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => handleSelect(result)}
                      className={cn(
                        "group flex w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
                        isSelected
                          ? "bg-primary/10 ring-1 ring-primary/30"
                          : "hover:bg-accent/60"
                      )}
                    >
                      <SearchResultIcon result={result} />

                      <div className="min-w-0 flex-1 grid gap-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {visibleColumns.has("title") && (
                            <span className="text-sm font-medium leading-tight">{result.title}</span>
                          )}
                          {visibleColumns.has("context") && result.subtitle && (
                            <span className="text-xs text-muted-foreground truncate max-w-[280px]">
                              {result.subtitle}
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] px-1.5 py-0 h-5 border", color)}
                          >
                            {result.feature}
                          </Badge>
                          {visibleColumns.has("kind") && (
                            <span className="text-[10px] text-muted-foreground">
                              {getResultTypeLabel(result)}
                            </span>
                          )}
                        </div>
                        {visibleColumns.has("description") && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {result.description}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(result.id);
                          }}
                          aria-label={result.starred ? "Remove favorite" : "Add favorite"}
                        >
                          <Star
                            className={cn(
                              "h-3.5 w-3.5",
                              result.starred
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground"
                            )}
                          />
                        </Button>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between border-t border-border/40 px-4 py-2 text-[11px] text-muted-foreground bg-muted/20">
            <span className="flex items-center gap-1">
              <Command className="h-3 w-3" />K to open
            </span>
            <span>
              {displayResults.length > 0 && query.trim()
                ? `${displayResults.length} result${displayResults.length === 1 ? "" : "s"} · `
                : ""}
              ↑↓ navigate · Enter open · ★ save
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
