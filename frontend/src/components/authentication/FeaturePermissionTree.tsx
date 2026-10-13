"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
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
} from "@/lib/feature-permissions";
import { FeatureGroup } from "@/lib/api/user-management";

const FLAT_CATEGORIES = getFlatFeatureCategories();
const ALL_FEATURES = FLAT_CATEGORIES.flatMap((c) => c.items.map((i) => i.feature));

// Category names come from lib/feature-permissions; map them to message keys for display.
const CATEGORY_KEYS: Record<string, "categories.vyosConfiguration" | "categories.systemGeneral"> = {
  "VyOS Configuration": "categories.vyosConfiguration",
  "System & General": "categories.systemGeneral",
};

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
  const t = useTranslations("authentication");
  const tc = useTranslations("common");
  const featureName = (f: FeatureGroup) => t(`features.${f}` as const);
  const categoryName = (name: string) => (CATEGORY_KEYS[name] ? t(CATEGORY_KEYS[name]) : name);
  const [openCats, setOpenCats] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      FLAT_CATEGORIES.map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (i) => !q || t(`features.${i.feature}` as const).toLowerCase().includes(q)
        ),
      })).filter((cat) => cat.items.length > 0),
    [q, t]
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
            {t("tree.allView")}
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => applyAll("edit")}>
            {t("tree.allEdit")}
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => applyAll("clear")}>
            {t("tree.clear")}
          </Button>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("tree.filterPlaceholder")}
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border divide-y divide-border max-h-72 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">{t("tree.noMatches")}</p>
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
                  {categoryName(cat.name)}
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
                          {featureName(item.feature)}
                        </span>
                        {item.binary ? (
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground">
                            <Checkbox checked={p.canView} onCheckedChange={() => toggleBinary(key)} />
                            {t("tree.allow")}
                          </label>
                        ) : (
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground">
                              <Checkbox checked={p.canView} onCheckedChange={() => togglePerm(key, "canView")} />
                              {t("tree.view")}
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground">
                              <Checkbox checked={p.canEdit} onCheckedChange={() => togglePerm(key, "canEdit")} />
                              {tc("edit")}
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
