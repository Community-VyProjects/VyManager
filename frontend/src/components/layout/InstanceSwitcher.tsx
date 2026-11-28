"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, Check, ChevronsUpDown, Loader2, Search, Settings2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sessionService, type ActiveSession, type Instance, type Site } from "@/lib/api/session";
import { useSessionStore } from "@/store/session-store";
import type { ApiError } from "@/lib/types/api";

interface SiteGroup {
  site: Site;
  instances: Instance[];
}

/**
 * The connected-instance card in the sidebar footer. Opens a searchable list
 * of every instance the user can reach, grouped by site, and switches to the
 * chosen one without going through the Sites page.
 */
export function InstanceSwitcher({ activeSession }: { activeSession: ActiveSession }) {
  const t = useTranslations("sidebar");
  const pathname = usePathname();
  const router = useRouter();
  const connectToInstance = useSessionStore((s) => s.connectToInstance);

  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<SiteGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const sites = await sessionService.listSites();
      const lists = await Promise.all(sites.map((site) => sessionService.listInstances(site.id)));
      setGroups(
        sites
          .map((site, i) => ({
            site,
            instances: [...lists[i]].sort((a, b) => a.name.localeCompare(b.name)),
          }))
          .filter((g) => g.instances.length > 0)
          .sort((a, b) => a.site.name.localeCompare(b.site.name)),
      );
    } catch (err) {
      setError((err as ApiError).message || t("switcher.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (switchingTo) return;
    setOpen(next);
    if (next) {
      setQuery("");
      load();
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => {
        if (g.site.name.toLowerCase().includes(q)) return g;
        return {
          ...g,
          instances: g.instances.filter((i) =>
            [i.name, i.host, i.description ?? ""].some((v) => v.toLowerCase().includes(q)),
          ),
        };
      })
      .filter((g) => g.instances.length > 0);
  }, [groups, query]);

  const handleSelect = async (instance: Instance) => {
    if (instance.id === activeSession.instance_id || !instance.is_active || switchingTo) return;
    setSwitchingTo(instance.id);
    setError(null);
    try {
      await connectToInstance(instance.id);
      // Pages, the banner stream and per-instance hooks all load against the
      // instance that was active when they mounted, so reload the current page
      // rather than swapping state underneath them.
      window.location.assign(pathname);
    } catch (err) {
      setError((err as ApiError).message || t("switcher.connectFailed", { name: instance.name }));
      setSwitchingTo(null);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex flex-1 min-w-0 items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title={t("switcher.title")}
          aria-label={t("switcher.title")}
        >
          <Building2 className="h-4 w-4 text-primary glow-text shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary truncate">{activeSession.instance_name}</p>
            <p className="text-[11px] text-muted-foreground truncate leading-tight">
              {activeSession.site_name}
            </p>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-[min(20rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("switcher.searchPlaceholder")}
            className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="max-h-80 overflow-y-auto overscroll-contain p-1">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("switcher.loading")}
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {query ? t("switcher.noMatches") : t("switcher.empty")}
              </p>
            ) : (
              filtered.map((g) => (
                <div key={g.site.id} className="py-1">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
                    {g.site.name}
                  </p>
                  {g.instances.map((instance) => {
                    const current = instance.id === activeSession.instance_id;
                    const disabled = current || !instance.is_active || !!switchingTo;
                    return (
                      <button
                        key={instance.id}
                        type="button"
                        onClick={() => handleSelect(instance)}
                        disabled={disabled}
                        aria-current={current ? "true" : undefined}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                          "hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                          "disabled:cursor-default disabled:hover:bg-transparent",
                          current && "bg-primary/10 disabled:hover:bg-primary/10",
                          !instance.is_active && "opacity-50",
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={cn("truncate font-medium", current && "text-primary")}>
                            {instance.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {instance.is_active
                              ? `${instance.host}:${instance.port}`
                              : t("switcher.inactive")}
                          </p>
                        </div>
                        {switchingTo === instance.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                        ) : current ? (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
        </div>

        {error && (
          <p className="border-t border-border px-3 py-2 text-xs text-destructive">{error}</p>
        )}

        <div className="border-t border-border p-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs"
            disabled={!!switchingTo}
            onClick={() => {
              setOpen(false);
              router.push("/sites");
            }}
          >
            <Settings2 className="h-3.5 w-3.5" />
            {t("switcher.manageSites")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
