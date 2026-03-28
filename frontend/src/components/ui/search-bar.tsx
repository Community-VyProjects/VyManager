"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X, ArrowRight, Settings, Database, Network, Shield, Route, Lock, Activity, Server } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { UnifiedView } from "./unified-view";
import { useUnifiedView } from "@/contexts/UnifiedViewContext";
import { useSearch } from "@/contexts/SearchContext";

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'page' | 'subnet' | 'client' | 'interface' | 'peer' | 'rule' | 'mapping' | 'certificate' | 'route' | 'nat-rule';
  category: string;
  href?: string;
  data?: any;
  icon?: React.ComponentType<{ className?: string }>;
}

const getTypeIcon = (type: SearchResult['type']) => {
  switch (type) {
    case 'page':
      return Settings;
    case 'subnet':
    case 'interface':
      return Network;
    case 'client':
    case 'peer':
      return Database;
    case 'rule':
      return Shield;
    default:
      return Database;
  }
};

const getCategoryColor = (category: string) => {
  switch (category.toLowerCase()) {
    case 'firewall':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'network':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'routing':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'vpn':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'monitoring':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'system':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    default:
      return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200';
  }
};

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { searchResults, isSearching, search } = useSearch();
  const { openUnifiedView, unifiedViewData, closeUnifiedView } = useUnifiedView();

  // Filter results based on query
  const filteredResults = searchResults.filter(result =>
    result.title.toLowerCase().includes(query.toLowerCase()) ||
    result.description.toLowerCase().includes(query.toLowerCase()) ||
    result.category.toLowerCase().includes(query.toLowerCase())
  );

  // Handle search input
  useEffect(() => {
    if (query.length > 0) {
      search(query);
      setIsOpen(true);
      setSelectedIndex(-1);
    } else {
      setIsOpen(false);
    }
  }, [query, search]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || filteredResults.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < filteredResults.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev > 0 ? prev - 1 : filteredResults.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < filteredResults.length) {
            handleResultClick(filteredResults[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex]);

  const handleResultClick = (result: SearchResult) => {
    if (result.href) {
      router.push(result.href);
    } else if (result.type === 'subnet') {
      openUnifiedView('subnet', result.data);
    } else if (result.type === 'client' || result.type === 'peer') {
      openUnifiedView('client', result.data);
    } else if (result.type === 'interface') {
      router.push('/network/interfaces');
    } else if (result.type === 'rule') {
      router.push('/firewall/policies');
    } else if (result.type === 'certificate') {
      router.push('/pki');
    } else if (result.type === 'route') {
      router.push('/routing/unicast-protocols');
    } else if (result.type === 'nat-rule') {
      router.push('/network/nat');
    } else {
      // default fallback to dashboard
      router.push('/');
    }

    setIsOpen(false);
    setQuery("");
    setSelectedIndex(-1);
  };

  const clearSearch = () => {
    setQuery("");
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search features, subnets, clients..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length > 0 && setIsOpen(true)}
          className="pl-9 pr-9"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0 hover:bg-muted"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-[1000] mt-1 w-full rounded-lg border border-border bg-background shadow-lg pointer-events-auto overflow-hidden">
          <ScrollArea className="max-h-[400px]">
            {isSearching ? (
              <div className="flex items-center justify-center py-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Searching...
                </div>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found
              </div>
            ) : (
              <div className="py-2">
                {filteredResults.map((result, index) => {
                  const Icon = result.icon || getTypeIcon(result.type);
                  const isSelected = index === selectedIndex;

                  return (
                    <button
                      key={result.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleResultClick(result)}
                      className={`w-full cursor-pointer px-3 py-2 text-left hover:bg-accent focus:bg-accent focus:outline-none ${
                        isSelected ? 'bg-accent' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3 break-words">
                        <div className="mt-0.5 shrink-0">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium truncate">
                              {result.title}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-xs ${getCategoryColor(result.category)}`}
                            >
                              {result.category}
                            </Badge>
                          </div>
                          <p className="whitespace-normal break-words text-xs text-muted-foreground line-clamp-2">
                            {result.description}
                          </p>
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground mt-1 flex-shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Unified View Dialog */}
      {unifiedViewData && (
        <UnifiedView
          isOpen={!!unifiedViewData}
          onClose={closeUnifiedView}
          type={unifiedViewData.type}
          data={unifiedViewData.data}
        />
      )}
    </div>
  );
}