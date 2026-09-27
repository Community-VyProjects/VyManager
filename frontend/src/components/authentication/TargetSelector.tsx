"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, Search, Server, Building2 } from "lucide-react";

export interface InstanceOption {
  id: string;
  name: string;
  siteId: string;
  siteName: string;
}
export interface SiteOption {
  id: string;
  name: string;
}

export type TargetType = "instance" | "site";

interface TargetSelectorProps {
  targetType: TargetType;
  onTargetTypeChange: (t: TargetType) => void;
  selectedIds: string[];
  onToggle: (id: string) => void;
  sites: SiteOption[];
  instances: InstanceOption[];
  /** Edit mode: lock the target type and only allow the existing target. */
  lockedToId?: string | null;
}

export function TargetSelector({
  targetType,
  onTargetTypeChange,
  selectedIds,
  onToggle,
  sites,
  instances,
  lockedToId,
}: TargetSelectorProps) {
  const t = useTranslations("authentication");
  const [query, setQuery] = useState("");
  const [closedSites, setClosedSites] = useState<string[]>([]);
  const locked = !!lockedToId;
  const q = query.trim().toLowerCase();

  const filteredSites = useMemo(
    () => sites.filter((s) => !q || s.name.toLowerCase().includes(q)),
    [sites, q]
  );

  const groupedInstances = useMemo(() => {
    const m = new Map<string, InstanceOption[]>();
    for (const i of instances) {
      if (q && !i.name.toLowerCase().includes(q) && !i.siteName.toLowerCase().includes(q)) continue;
      if (!m.has(i.siteName)) m.set(i.siteName, []);
      m.get(i.siteName)!.push(i);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [instances, q]);

  return (
    <div className="space-y-2">
      <Label>{t("target.label")}</Label>
      <div className="flex gap-2">
        {(["instance", "site"] as TargetType[]).map((type) => (
          <Button
            key={type}
            type="button"
            variant={targetType === type ? "default" : "outline"}
            size="sm"
            className="gap-1.5 flex-1"
            disabled={locked}
            onClick={() => onTargetTypeChange(type)}
          >
            {type === "instance" ? <Server className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
            {type === "instance" ? t("target.instances") : t("target.wholeSites")}
          </Button>
        ))}
      </div>
      {targetType === "site" && !locked && (
        <p className="text-xs text-muted-foreground">
          {t("target.siteHint")}
        </p>
      )}

      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={targetType === "site" ? t("target.filterSites") : t("target.filterInstances")}
          className="h-7 pl-7 text-xs"
        />
      </div>

      <div className="rounded-lg border border-border max-h-64 overflow-y-auto divide-y divide-border">
        {targetType === "site" ? (
          filteredSites.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">{t("target.noSites")}</p>
          ) : (
            filteredSites.map((s) => (
              <label key={s.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer">
                <Checkbox
                  checked={selectedIds.includes(s.id)}
                  onCheckedChange={() => onToggle(s.id)}
                  disabled={locked && lockedToId !== s.id}
                />
                {s.name}
              </label>
            ))
          )
        ) : groupedInstances.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">{t("target.noInstances")}</p>
        ) : (
          groupedInstances.map(([siteName, list]) => {
            const isOpen = q !== "" || !closedSites.includes(siteName);
            return (
              <Collapsible
                key={siteName}
                open={isOpen}
                onOpenChange={(o) =>
                  setClosedSites((c) => (o ? c.filter((n) => n !== siteName) : [...c, siteName]))
                }
              >
                <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50">
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  {siteName}
                  <span className="ml-1">({list.length})</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {list.map((i) => (
                    <label
                      key={i.id}
                      className="flex items-center gap-2 pl-8 pr-3 py-1.5 text-sm cursor-pointer border-t border-border/50"
                    >
                      <Checkbox
                        checked={selectedIds.includes(i.id)}
                        onCheckedChange={() => onToggle(i.id)}
                        disabled={locked && lockedToId !== i.id}
                      />
                      {i.name}
                    </label>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })
        )}
      </div>
    </div>
  );
}
