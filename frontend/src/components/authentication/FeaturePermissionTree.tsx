"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, Search } from "lucide-react";
import {
  getFlatFeatureCategories,
  getFeatureAndDescendants,
  FEATURE_DISPLAY_NAMES,
} from "@/lib/feature-permissions";
import { FeatureGroup } from "@/lib/api/user-management";

const FLAT_CATEGORIES = getFlatFeatureCategories();
const ALL_FEATURES = FLAT_CATEGORIES.flatMap((c) => c.items.map((i) => i.feature));

export type FeaturePermsMap = Record<string, { canEdit: boolean; canView: boolean }>;

interface FeaturePermissionTreeProps {
  value: FeaturePermsMap;
  onChange: (next: FeaturePermsMap) => void;
}

/**
 * Compact feature-permission picker: quick presets (all view / all edit /
 * clear), a search filter, and a collapsible category tree (view/edit, or a
 * single "Allow" for binary features). Checking a parent cascades to children.
 * Shared by the SSO and user-access grant editors.
 */
export function FeaturePermissionTree({ value, onChange }: FeaturePermissionTreeProps) {
  const [openCats, setOpenCats] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      FLAT_CATEGORIES.map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (i) => !q || (FEATURE_DISPLAY_NAMES[i.feature] ?? i.feature).toLowerCase().includes(q)
        ),
      })).filter((cat) => cat.items.length > 0),
    [q]
  );

  const applyAll = (mode: "view" | "edit" | "clear") => {
    if (mode === "clear") return onChange({});
    const flags = mode === "edit" ? { canEdit: true, canView: true } : { canEdit: false, canView: true };
    onChange(Object.fromEntries(ALL_FEATURES.map((f) => [f, { ...flags }])));
  };

  const togglePerm = (feature: string, key: "canEdit" | "canView") => {
    const newVal = !(value[feature]?.[key] ?? false);
    const next: FeaturePermsMap = { ...value };
    for (const f of getFeatureAndDescendants(feature as FeatureGroup)) {
      const cur = next[f] ?? { canEdit: false, canView: false };
      const updated = { ...cur, [key]: newVal };
      if (key === "canEdit" && newVal) updated.canView = true;
      if (key === "canView" && !newVal) updated.canEdit = false;
      next[f] = updated;
    }
    onChange(next);
  };

  const toggleBinary = (feature: string) => {
    const allowed = value[feature]?.canView ?? false;
    onChange({
      ...value,
      [feature]: allowed
        ? { canEdit: false, canView: false }
        : { canEdit: true, canView: true },
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => applyAll("view")}>
            All view
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => applyAll("edit")}>
            All edit
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => applyAll("clear")}>
            Clear
          </Button>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter features…"
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border divide-y divide-border max-h-72 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">No matching features</p>
        ) : (
          filtered.map((cat) => {
            const isOpen = q !== "" || openCats.includes(cat.name);
            return (
              <Collapsible
                key={cat.name}
                open={isOpen}
                onOpenChange={(o) =>
                  setOpenCats((c) => (o ? [...c, cat.name] : c.filter((n) => n !== cat.name)))
                }
              >
                <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium hover:bg-muted/50">
                  <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  {cat.name}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {cat.items.map((item) => {
                    const key = item.feature as string;
                    const p = value[key] ?? { canEdit: false, canView: false };
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between py-1.5 text-sm border-t border-border/50"
                        style={{ paddingLeft: `${28 + (q ? 0 : item.depth * 16)}px`, paddingRight: "12px" }}
                      >
                        <span className="text-foreground">
                          {FEATURE_DISPLAY_NAMES[item.feature] ?? key}
                        </span>
                        {item.binary ? (
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground">
                            <Checkbox checked={p.canView} onCheckedChange={() => toggleBinary(key)} />
                            Allow
                          </label>
                        ) : (
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground">
                              <Checkbox checked={p.canView} onCheckedChange={() => togglePerm(key, "canView")} />
                              View
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground">
                              <Checkbox checked={p.canEdit} onCheckedChange={() => togglePerm(key, "canEdit")} />
                              Edit
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })
        )}
      </div>
    </div>
  );
}
