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
import { Activity, ChevronDown, HeartPulse, Shield, ShieldCheck, Network, Server, Settings, LayoutDashboard, Route, Lock, LogOut, User, FileText, Building2, Power, PowerOff, Scale } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "@/lib/auth-client";
import { useSessionStore } from "@/store/session-store";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { ThemeSelector } from "@/components/ui/theme-selector";
import { SearchBar } from "@/components/ui/search-bar";

import { navigation } from "@/lib/navigation";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredPermission?: FeatureGroup;
  children?: {
    title: string;
    href: string;
    requiredPermission?: FeatureGroup;
  }[];
}



export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [openItems, setOpenItems] = useState<string[]>([]);
  const { data: session } = useSession();
  const { activeSession, loadSession, disconnectFromInstance } = useSessionStore();
  const { canRead } = usePermissions();

  // Load active session on mount
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const handleLogout = async () => {
    // Disconnect from instance before logging out to clean up active_sessions
    if (activeSession) {
      try {
        await disconnectFromInstance();
      } catch (err) {
        // Continue with logout even if disconnect fails
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

  /**
   * Filter navigation items based on user permissions.
   * Only shows items if:
   * 1. No permission required, OR
   * 2. User has READ access to the required feature
   * 3. Special case: Unicast Protocols shows if user has any routing protocol permission
   */
  const filterNavigation = (items: NavItem[]): NavItem[] => {
    return items.map((item) => {
      // Filter children first
      if (item.children) {
        const visibleChildren = item.children.filter((child) => {
          // If no permission required, always show
          if (!child.requiredPermission) return true;

          // Special case for Unicast Protocols: show if user has UNICAST_PROTOCOLS
          // OR any individual routing protocol permission
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

          // Special case for Static & Failover: show if user has STATIC_ROUTES OR FAILOVER
          if (child.requiredPermission === FeatureGroup.STATIC_ROUTES) {
            return canRead(FeatureGroup.STATIC_ROUTES) || canRead(FeatureGroup.FAILOVER);
          }

          // Special case for Routing Infrastructure: show if user has ROUTING_INFRASTRUCTURE
          // OR any individual infrastructure component permission
          if (child.requiredPermission === FeatureGroup.ROUTING_INFRASTRUCTURE) {
            return canRead(FeatureGroup.ROUTING_INFRASTRUCTURE) ||
                   canRead(FeatureGroup.BFD) ||
                   canRead(FeatureGroup.MPLS) ||
                   canRead(FeatureGroup.SEGMENT_ROUTING) ||
                   canRead(FeatureGroup.NHRP) ||
                   canRead(FeatureGroup.RPKI);
          }

          // Special case for Multicast: show if user has MULTICAST
          // OR any individual multicast protocol permission
          if (child.requiredPermission === FeatureGroup.MULTICAST) {
            return canRead(FeatureGroup.MULTICAST) ||
                   canRead(FeatureGroup.IGMP_PROXY) ||
                   canRead(FeatureGroup.PIM) ||
                   canRead(FeatureGroup.PIM6);
          }

          // Special cases for Firewall sub-features: show if user has FIREWALL OR the specific permission
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

          // Special cases for Routing Policies: show if user has ROUTING_POLICIES OR the specific permission
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

          // If permission required, check if user has READ access
          return canRead(child.requiredPermission);
        });

        // If all children are filtered out, hide the parent
        if (visibleChildren.length === 0) {
          return null;
        }

        return { ...item, children: visibleChildren };
      }

      // For items without children, check permission requirement
      if (item.requiredPermission && !canRead(item.requiredPermission)) {
        return null;
      }

      return item;
    }).filter((item): item is NavItem => item !== null);
  };

  const visibleNavigation = filterNavigation(navigation);

  return (
    <div className="flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="flex h-16 items-center border-b border-border px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center">
            <Image
              src="/vy-icon.png"
              alt="VyOS Logo"
              width={40}
              height={40}
              className="object-contain"
              loader={({ src }) => src}
            />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">VyManager</h1>
            <p className="text-xs text-muted-foreground">VyOS Management</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-1 shrink-0">
        <SearchBar />
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4 min-h-0">
        <nav className="space-y-1">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href ||
              item.children?.some(child => pathname === child.href);

            if (item.children) {
              const isOpen = openItems.includes(item.title);
              return (
                <Collapsible
                  key={item.title}
                  open={isOpen}
                  onOpenChange={() => toggleItem(item.title)}
                >
                  <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
                    <div className="flex items-center gap-3">
                      <Icon className={cn(
                        "h-4 w-4",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        isActive ? "text-foreground" : "text-muted-foreground"
                      )}>{item.title}</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
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
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                            isChildActive
                              ? "bg-accent text-accent-foreground font-medium"
                              : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                          )}
                        >
                          <span className={cn(
                            "h-1.5 w-1.5 rounded-full",
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

            return (
              <Link
                key={item.title}
                href={item.href!}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                )}
              >
                <Icon className={cn(
                  "h-4 w-4",
                  isActive ? "text-primary" : "text-muted-foreground"
                )} />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border p-4 space-y-3 shrink-0">
        {/* Theme Selector */}
        <div className="space-y-2">
          <ThemeSelector />
        </div>

        {/* Active Instance Indicator */}
        {activeSession ? (
          <div className="space-y-2">
            <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-primary truncate">
                    {activeSession.instance_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {activeSession.site_name}
                  </p>
                </div>
                <div
                  className="h-2 w-2 rounded-full bg-green-500 animate-pulse"
                  title="Connected"
                />
              </div>
              <Button
                onClick={async () => {
                  await disconnectFromInstance();
                  router.push("/sites");
                }}
                variant="outline"
                size="sm"
                className="w-full justify-center gap-2 text-xs"
              >
                <PowerOff className="h-3 w-3" />
                Disconnect Instance
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="rounded-lg bg-muted/50 border border-border p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    No Instance
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Not connected
                  </p>
                </div>
                <div
                  className="h-2 w-2 rounded-full bg-gray-500"
                  title="Disconnected"
                />
              </div>
              <Button
                onClick={() => router.push("/sites")}
                variant="default"
                size="sm"
                className="w-full justify-center gap-2 text-xs"
              >
                <Power className="h-3 w-3" />
                Connect to Instance
              </Button>
            </div>
          </div>
        )}

        {/* User Info & Logout */}
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <User className="h-4 w-4 text-primary" />
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
            className="w-full justify-center gap-2 text-xs"
            size="sm"
          >
            <LogOut className="h-3 w-3" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
