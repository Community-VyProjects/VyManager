"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, LogOut, User, Building2, Power, PowerOff, PanelLeftClose, PanelLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSession, signOut } from "@/lib/auth-client";
import { useSessionStore } from "@/store/session-store";
import { useSidebarStore } from "@/store/sidebar-store";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { ThemeSelector } from "@/components/ui/theme-selector";
import { SearchBar } from "@/components/ui/search-bar";

import { navigation, NavItem } from "@/lib/navigation";

interface SidebarProps {
  onNavigate?: () => void;
  forceMobile?: boolean;
}

export function Sidebar({ onNavigate, forceMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [openItems, setOpenItems] = useState<string[]>([]);
  const { data: session } = useSession();
  const { activeSession, loadSession, disconnectFromInstance } = useSessionStore();
  const { collapsed, toggle } = useSidebarStore();
  const { canRead } = usePermissions();

  // In mobile sheet, always show expanded
  const isCollapsed = forceMobile ? false : collapsed;

  // Load active session on mount
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const handleLogout = async () => {
    if (activeSession) {
      try {
        await disconnectFromInstance();
      } catch (err) {
        console.error("Failed to disconnect from instance:", err);
      }
    }
    await signOut();
    router.push("/login");
  };

  // Initialize and update openItems based on current pathname
  useEffect(() => {
    const activeParents: string[] = [];
    navigation.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => pathname === child.href);
        if (hasActiveChild) {
          activeParents.push(item.title);
        }
      }
    });
    setOpenItems(activeParents);
  }, [pathname]);

  const toggleItem = (title: string) => {
    setOpenItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  const filterNavigation = (items: NavItem[]): NavItem[] => {
    return items.map((item) => {
      if (item.children) {
        const visibleChildren = item.children.filter((child) => {
          if (!child.requiredPermission) return true;

          if (child.requiredPermission === FeatureGroup.UNICAST_PROTOCOLS) {
            return canRead(FeatureGroup.UNICAST_PROTOCOLS) ||
                   canRead(FeatureGroup.BGP) ||
                   canRead(FeatureGroup.OSPF) ||
                   canRead(FeatureGroup.OSPFV3) ||
                   canRead(FeatureGroup.ISIS) ||
                   canRead(FeatureGroup.OPENFABRIC) ||
                   canRead(FeatureGroup.RIP) ||
                   canRead(FeatureGroup.RIPNG) ||
                   canRead(FeatureGroup.BABEL);
          }

          if (child.requiredPermission === FeatureGroup.STATIC_ROUTES) {
            return canRead(FeatureGroup.STATIC_ROUTES) || canRead(FeatureGroup.FAILOVER);
          }

          if (child.requiredPermission === FeatureGroup.ROUTING_INFRASTRUCTURE) {
            return canRead(FeatureGroup.ROUTING_INFRASTRUCTURE) ||
                   canRead(FeatureGroup.BFD) ||
                   canRead(FeatureGroup.MPLS) ||
                   canRead(FeatureGroup.SEGMENT_ROUTING) ||
                   canRead(FeatureGroup.NHRP) ||
                   canRead(FeatureGroup.RPKI);
          }

          if (child.requiredPermission === FeatureGroup.MULTICAST) {
            return canRead(FeatureGroup.MULTICAST) ||
                   canRead(FeatureGroup.IGMP_PROXY) ||
                   canRead(FeatureGroup.PIM) ||
                   canRead(FeatureGroup.PIM6);
          }

          if (child.requiredPermission === FeatureGroup.FIREWALL_POLICIES) {
            return canRead(FeatureGroup.FIREWALL) || canRead(FeatureGroup.FIREWALL_POLICIES);
          }
          if (child.requiredPermission === FeatureGroup.FIREWALL_BRIDGE) {
            return canRead(FeatureGroup.FIREWALL) || canRead(FeatureGroup.FIREWALL_BRIDGE);
          }
          if (child.requiredPermission === FeatureGroup.FIREWALL_GROUPS) {
            return canRead(FeatureGroup.FIREWALL) || canRead(FeatureGroup.FIREWALL_GROUPS);
          }
          if (child.requiredPermission === FeatureGroup.FIREWALL_ZONES) {
            return canRead(FeatureGroup.FIREWALL) || canRead(FeatureGroup.FIREWALL_ZONES);
          }
          if (child.requiredPermission === FeatureGroup.FIREWALL_GLOBAL_OPTIONS) {
            return canRead(FeatureGroup.FIREWALL) || canRead(FeatureGroup.FIREWALL_GLOBAL_OPTIONS);
          }
          if (child.requiredPermission === FeatureGroup.FIREWALL_FLOWTABLES) {
            return canRead(FeatureGroup.FIREWALL) || canRead(FeatureGroup.FIREWALL_FLOWTABLES);
          }

          if (child.requiredPermission === FeatureGroup.ACCESS_LIST) {
            return canRead(FeatureGroup.ROUTING_POLICIES) || canRead(FeatureGroup.ACCESS_LIST);
          }
          if (child.requiredPermission === FeatureGroup.PREFIX_LIST) {
            return canRead(FeatureGroup.ROUTING_POLICIES) || canRead(FeatureGroup.PREFIX_LIST);
          }
          if (child.requiredPermission === FeatureGroup.ROUTE_POLICY) {
            return canRead(FeatureGroup.ROUTING_POLICIES) || canRead(FeatureGroup.ROUTE_POLICY);
          }
          if (child.requiredPermission === FeatureGroup.ROUTE_MAP) {
            return canRead(FeatureGroup.ROUTING_POLICIES) || canRead(FeatureGroup.ROUTE_MAP);
          }
          if (child.requiredPermission === FeatureGroup.LOCAL_ROUTE) {
            return canRead(FeatureGroup.ROUTING_POLICIES) || canRead(FeatureGroup.LOCAL_ROUTE);
          }
          if (child.requiredPermission === FeatureGroup.BGP_AS_PATH) {
            return canRead(FeatureGroup.ROUTING_POLICIES) || canRead(FeatureGroup.BGP_AS_PATH);
          }
          if (child.requiredPermission === FeatureGroup.BGP_COMMUNITY) {
            return canRead(FeatureGroup.ROUTING_POLICIES) || canRead(FeatureGroup.BGP_COMMUNITY);
          }
          if (child.requiredPermission === FeatureGroup.BGP_EXTENDED_COMMUNITY) {
            return canRead(FeatureGroup.ROUTING_POLICIES) || canRead(FeatureGroup.BGP_EXTENDED_COMMUNITY);
          }
          if (child.requiredPermission === FeatureGroup.BGP_LARGE_COMMUNITY) {
            return canRead(FeatureGroup.ROUTING_POLICIES) || canRead(FeatureGroup.BGP_LARGE_COMMUNITY);
          }

          return canRead(child.requiredPermission);
        });

        if (visibleChildren.length === 0) return null;
        return { ...item, children: visibleChildren };
      }

      if (item.requiredPermission && !canRead(item.requiredPermission)) {
        return null;
      }

      return item;
    }).filter((item): item is NavItem => item !== null);
  };

  const visibleNavigation = filterNavigation(navigation);

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "flex h-screen flex-col bg-card",
          forceMobile
            ? "w-full"
            : cn("border-r border-border transition-[width] duration-200 ease-in-out", isCollapsed ? "w-16" : "w-64")
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex h-14 items-center border-b border-border shrink-0",
          isCollapsed ? "justify-center px-2" : "px-4"
        )}>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center">
              <Image
                src="/vy-icon.png"
                alt="VyOS Logo"
                width={32}
                height={32}
                className="object-contain"
                loader={({ src }) => src}
              />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-sm font-semibold text-foreground">VyManager</h1>
              </div>
            )}
          </div>
        </div>

        {/* Search — hidden when collapsed */}
        {!isCollapsed && (
          <div className="px-3 pt-3 pb-1 shrink-0">
            <SearchBar />
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2 py-3 min-h-0">
          <nav className="space-y-1">
            {visibleNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href ||
                item.children?.some(child => pathname === child.href);

              if (item.children) {
                const isOpen = openItems.includes(item.title);

                if (isCollapsed) {
                  // Collapsed: show parent icon with tooltip, link to first child
                  const firstChild = item.children[0];
                  return (
                    <Tooltip key={item.title}>
                      <TooltipTrigger asChild>
                        <Link
                          href={firstChild?.href || "#"}
                          onClick={onNavigate}
                          className={cn(
                            "flex h-9 w-full items-center justify-center rounded-md transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8}>
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <Collapsible
                    key={item.title}
                    open={isOpen}
                    onOpenChange={() => toggleItem(item.title)}
                  >
                    <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
                      <div className="flex items-center gap-3">
                        <Icon className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )} />
                        <span className={cn(
                          isActive ? "text-foreground" : "text-muted-foreground"
                        )}>{item.title}</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform duration-200",
                          isOpen && "rotate-180"
                        )}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 space-y-1 pl-4">
                      {item.children.map((child) => {
                        const isChildActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onNavigate}
                            className={cn(
                              "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors",
                              isChildActive
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                            )}
                          >
                            <span className={cn(
                              "h-1.5 w-1.5 rounded-full shrink-0",
                              isChildActive ? "bg-primary" : "bg-muted-foreground/40"
                            )} />
                            {child.title}
                          </Link>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                );
              }

              // Single nav item (no children)
              if (isCollapsed) {
                return (
                  <Tooltip key={item.title}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href!}
                        onClick={onNavigate}
                        className={cn(
                          "flex h-9 w-full items-center justify-center rounded-md transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {item.title}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Link
                  key={item.title}
                  href={item.href!}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className={cn(
          "border-t border-border shrink-0",
          isCollapsed ? "p-2 space-y-2" : "p-3 space-y-2"
        )}>
          {/* Theme Selector — hidden when collapsed */}
          {!isCollapsed && (
            <ThemeSelector />
          )}

          {/* Active Instance Indicator */}
          {activeSession ? (
            isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex h-9 items-center justify-center">
                    <div className="relative">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500" />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  <div>
                    <p className="font-medium">{activeSession.instance_name}</p>
                    <p className="text-xs text-muted-foreground">{activeSession.site_name}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-2.5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {activeSession.instance_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {activeSession.site_name}
                    </p>
                  </div>
                  <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" title="Connected" />
                </div>
                <Button
                  onClick={async () => {
                    await disconnectFromInstance();
                    router.push("/sites");
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full justify-center gap-1.5 text-xs h-7"
                >
                  <PowerOff className="h-3 w-3" />
                  Disconnect
                </Button>
              </div>
            )
          ) : (
            isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => router.push("/sites")}
                    className="flex h-9 w-full items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <Building2 className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  Connect to Instance
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="rounded-lg bg-muted/50 border border-border p-2.5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">No Instance</p>
                  </div>
                  <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" title="Disconnected" />
                </div>
                <Button
                  onClick={() => router.push("/sites")}
                  variant="default"
                  size="sm"
                  className="w-full justify-center gap-1.5 text-xs h-7"
                >
                  <Power className="h-3 w-3" />
                  Connect
                </Button>
              </div>
            )
          )}

          {/* User Info & Logout */}
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="flex h-9 w-full items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <User className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                <div>
                  <p className="font-medium">{session?.user?.name || session?.user?.email || "User"}</p>
                  <p className="text-xs text-muted-foreground">Click to log out</p>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="rounded-lg bg-muted/50 p-2.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {session?.user?.name || session?.user?.email || "User"}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="w-full justify-center gap-1.5 text-xs h-7"
              >
                <LogOut className="h-3 w-3" />
                Logout
              </Button>
            </div>
          )}

          {/* Collapse toggle — only on desktop */}
          {!forceMobile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggle}
                  className="flex h-8 w-full items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {isCollapsed ? (
                    <PanelLeft className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
