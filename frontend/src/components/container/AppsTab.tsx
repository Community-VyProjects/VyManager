"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { CheckCircle2, Search } from "lucide-react";
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

export function AppsTab({ config, capabilities, hasWritePermission, onReload }: Props) {
  const [search, setSearch] = useState("");
  const [installingApp, setInstallingApp] = useState<AppDef | null>(null);

  const q = search.toLowerCase();
  const filtered = APP_CATALOG.filter(app =>
    !q ||
    app.name.toLowerCase().includes(q) ||
    app.description.toLowerCase().includes(q) ||
    app.category.toLowerCase().includes(q) ||
    app.tags.some(t => t.includes(q))
  );

  const categoryOrder = Array.from(new Set(APP_CATALOG.map(app => app.category)));
  const groupedApps = filtered.reduce<Record<string, AppDef[]>>((groups, app) => {
    groups[app.category] = groups[app.category] ?? [];
    groups[app.category].push(app);
    return groups;
  }, {});
  const orderedCategories = categoryOrder.filter(category => (groupedApps[category]?.length ?? 0) > 0);

  return (
    <>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search apps…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
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
                  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {category}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {apps.length} app{apps.length === 1 ? "" : "s"}
                      </p>
                    </div>
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
