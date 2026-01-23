"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Globe,
  Server,
  Shield,
  Network,
  Route,
  FileArchive,
  Loader2,
  Command,
} from "lucide-react";
import { searchService, type SearchResult, type SearchResultType } from "@/lib/api/search";
import { useSessionStore } from "@/store/session-store";
import { cn } from "@/lib/utils";

// Icon mapping
const iconMap: Record<string, React.ElementType> = {
  globe: Globe,
  server: Server,
  shield: Shield,
  network: Network,
  route: Route,
  "file-archive": FileArchive,
};

// Type labels and colors
const typeConfig: Record<SearchResultType, { label: string; color: string }> = {
  site: { label: "Site", color: "bg-blue-500/10 text-blue-500" },
  instance: { label: "Instance", color: "bg-purple-500/10 text-purple-500" },
  interface: { label: "Interface", color: "bg-green-500/10 text-green-500" },
  firewall_rule: { label: "Firewall", color: "bg-orange-500/10 text-orange-500" },
  nat_rule: { label: "NAT", color: "bg-yellow-500/10 text-yellow-500" },
  route: { label: "Route", color: "bg-cyan-500/10 text-cyan-500" },
  vpn: { label: "VPN", color: "bg-indigo-500/10 text-indigo-500" },
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { connectToInstance } = useSessionStore();

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Search with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await searchService.search(query);
        setResults(response.results);
        setSelectedIndex(0);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Handle result selection
  const handleSelect = useCallback(
    async (result: SearchResult) => {
      setOpen(false);

      // If it's an instance, connect to it first
      if (result.type === "instance" && result.instanceId) {
        try {
          await connectToInstance(result.instanceId);
        } catch (err) {
          console.error("Failed to connect:", err);
        }
      }

      router.push(result.href);
    },
    [router, connectToInstance]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
    }
  };

  return (
    <>
      {/* Trigger button (optional, can be hidden) */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-md border transition-colors"
      >
        <Search className="h-4 w-4" />
        <span>Search...</span>
        <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 gap-0 max-w-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center border-b px-4">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search sites, instances, configs..."
              className="border-0 focus-visible:ring-0 text-base h-14"
            />
            {loading && (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground shrink-0" />
            )}
          </div>

          {/* Results */}
          <ScrollArea className="max-h-[400px]">
            {results.length === 0 && query && !loading && (
              <div className="p-8 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No results found for "{query}"</p>
              </div>
            )}

            {results.length === 0 && !query && (
              <div className="p-8 text-center text-muted-foreground">
                <p>Start typing to search...</p>
                <p className="text-sm mt-1">
                  Search across sites, instances, and configurations
                </p>
              </div>
            )}

            {results.length > 0 && (
              <div className="p-2">
                {results.map((result, index) => {
                  const IconComponent = iconMap[result.icon || "globe"] || Globe;
                  const config = typeConfig[result.type];

                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleSelect(result)}
                      className={cn(
                        "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                        index === selectedIndex
                          ? "bg-accent"
                          : "hover:bg-accent/50"
                      )}
                    >
                      <div className={cn("p-2 rounded-lg shrink-0", config.color)}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {result.title}
                          </span>
                          <span
                            className={cn(
                              "text-xs px-1.5 py-0.5 rounded shrink-0",
                              config.color
                            )}
                          >
                            {config.label}
                          </span>
                        </div>
                        {result.subtitle && (
                          <p className="text-sm text-muted-foreground truncate">
                            {result.subtitle}
                          </p>
                        )}
                        {result.description && (
                          <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                            {result.description}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/50 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border">↵</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border">Esc</kbd>
                Close
              </span>
            </div>
            {results.length > 0 && (
              <span>{results.length} results</span>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
