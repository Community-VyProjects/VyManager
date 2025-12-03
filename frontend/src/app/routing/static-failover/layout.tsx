"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MapPin, ChevronRight, Route, Activity } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type RouteType = "static" | "failover";

const routes = [
  { id: "static" as RouteType, name: "Static Routes", description: "Manually configured routes", icon: Route, href: "/routing/static-failover/static-routes" },
  { id: "failover" as RouteType, name: "Failover / Tracking", description: "Route failover and health tracking", icon: Activity, href: "/routing/static-failover/failover" },
];

export default function StaticFailoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Left Sidebar - Route Type Selector */}
        <div className="w-80 border-r border-border bg-card flex flex-col h-full">
          <div className="p-6 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Static & Failover</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Static routes and failover
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Route Type List */}
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-1 py-3">
              {routes.map((route) => {
                const Icon = route.icon;
                const active = isActive(route.href);
                return (
                  <button
                    key={route.id}
                    onClick={() => router.push(route.href)}
                    className={cn(
                      "w-full text-left rounded-lg px-3 py-3 transition-all",
                      active
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "mt-0.5 rounded-md p-1.5",
                        active ? "bg-primary/10" : "bg-muted"
                      )}>
                        <Icon className={cn(
                          "h-4 w-4",
                          active ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={cn(
                            "font-medium text-sm",
                            active ? "text-foreground" : "text-foreground"
                          )}>
                            {route.name}
                          </span>
                          {active && (
                            <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {route.description}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </AppLayout>
  );
}
