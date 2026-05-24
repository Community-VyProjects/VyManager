"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckCircle2, ChevronDown, Search } from "lucide-react";
import { APP_CATALOG, type AppDef } from "@/lib/apps-catalog";
import { WIZARD_REGISTRY } from "@/lib/apps-registry";
import { GenericAppWizard } from "./GenericAppWizard";
import type { ContainerConfig, ContainerCapabilities } from "@/lib/api/container";

interface Props {
  config: ContainerConfig;
  capabilities: ContainerCapabilities | null;
  hasWritePermission: boolean;
  onReload: () => void;
}

function AppIcon({ app }: { app: AppDef }) {
  if (app.iconPath) {
    return (
      <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center shrink-0 overflow-hidden p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={app.iconPath} alt={`${app.name} icon`} className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-2xl font-bold text-primary">{app.name[0].toUpperCase()}</span>
    </div>
  );
}

function isAppInstalled(app: AppDef, config: ContainerConfig): boolean {
  return config.containers.some(c => c.image?.includes(app.dockerImage.split(":")[0]));
}

const ALL_CATEGORIES = Array.from(new Set(APP_CATALOG.map(app => app.category)));

export function AppsTab({ config, capabilities, hasWritePermission, onReload }: Props) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [installingApp, setInstallingApp] = useState<AppDef | null>(null);

  const q = search.toLowerCase();
  const filtered = APP_CATALOG.filter(app => {
    if (activeCategory && app.category !== activeCategory) return false;
    return (
      !q ||
      app.name.toLowerCase().includes(q) ||
      app.description.toLowerCase().includes(q) ||
      app.category.toLowerCase().includes(q) ||
      app.tags.some(t => t.includes(q))
    );
  });

  const groupedApps = filtered.reduce<Record<string, AppDef[]>>((groups, app) => {
    groups[app.category] = groups[app.category] ?? [];
    groups[app.category].push(app);
    return groups;
  }, {});
  const orderedCategories = ALL_CATEGORIES.filter(category => (groupedApps[category]?.length ?? 0) > 0);

  return (
    <>
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search apps…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="shrink-0 gap-1.5">
                {activeCategory ?? "All Categories"}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setActiveCategory(null)}>
                All Categories
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {ALL_CATEGORIES.map(cat => (
                <DropdownMenuItem key={cat} onClick={() => setActiveCategory(cat)}>
                  {cat}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Search className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm">No apps match your search.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {orderedCategories.map(category => {
              const apps = (groupedApps[category] ?? []).slice().sort((a, b) => {
                return (a.order ?? 0) - (b.order ?? 0);
              });

              return (
                <div key={category}>
                  <div className="pl-3 border-l-2 border-primary mb-4">
                    <p className="font-semibold text-foreground">{category}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {apps.length} app{apps.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {apps.map(app => {
                      const installed = isAppInstalled(app, config);
                      return (
                        <Card key={app.id} className="flex flex-col">
                          <CardContent className="flex-1 p-5 space-y-3">
                            <div className="flex items-center gap-3">
                              <AppIcon app={app} />
                              <div className="min-w-0">
                                <h3 className="font-semibold text-base leading-tight">{app.name}</h3>
                                <Badge variant="outline" className="text-xs mt-1">{app.category}</Badge>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                              {app.description}
                            </p>
                          </CardContent>

                          <CardFooter className="p-4 pt-0">
                            {installed ? (
                              <Button variant="outline" className="w-full" disabled>
                                <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                                Installed
                              </Button>
                            ) : (
                              <Button
                                className="w-full"
                                disabled={!hasWritePermission}
                                onClick={() => setInstallingApp(app)}
                              >
                                Install
                              </Button>
                            )}
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {installingApp && (() => {
        const WizardComponent = WIZARD_REGISTRY[installingApp.id] ?? GenericAppWizard;
        return (
          <WizardComponent
            open={true}
            onOpenChange={open => { if (!open) setInstallingApp(null); }}
            config={config}
            capabilities={capabilities}
            onComplete={() => { setInstallingApp(null); onReload(); }}
            app={installingApp}
          />
        );
      })()}
    </>
  );
}
