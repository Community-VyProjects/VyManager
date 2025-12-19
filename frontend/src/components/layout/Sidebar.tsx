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
import { ChevronDown, Shield, Network, Server, Settings, LayoutDashboard, Route, Lock, LogOut, User, FileText, Building2, Power, PowerOff } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "@/lib/auth-client";
import { useSessionStore } from "@/store/session-store";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: {
    title: string;
    href: string;
  }[];
}

const navigation: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Firewall",
    icon: Shield,
    children: [
      { title: "Policies", href: "/firewall/policies" },
      { title: "Groups", href: "/firewall/groups" },
      { title: "Zones", href: "/firewall/zones" },
    ],
  },
  {
    title: "Network",
    icon: Network,
    children: [
      { title: "DHCP", href: "/network/dhcp" },
      { title: "Routes", href: "/network/routes" },
      { title: "VRF", href: "/network/vrf" },
      { title: "Interfaces", href: "/network/interfaces" },
      { title: "Load Balancing", href: "/network/load-balancing" },
      { title: "NAT", href: "/network/nat" },
    ],
  },
  {
    title: "Routing",
    icon: Route,
    children: [
      { title: "Unicast Protocols", href: "/routing/unicast-protocols" },
      { title: "Static & Failover", href: "/routing/static-failover" },
      { title: "Routing Infrastructure", href: "/routing/infrastructure" },
      { title: "Multicast", href: "/routing/multicast" },
    ],
  },
  {
    title: "Policies",
    icon: FileText,
    children: [
      { title: "Access List", href: "/policies/access-list" },
      { title: "Prefix List", href: "/policies/prefix-list" },
      { title: "Route", href: "/policies/route" },
      { title: "Route Map", href: "/policies/route-map" },
      { title: "Local Route", href: "/policies/local-route" },
      { title: "BGP AS", href: "/policies/bgp-as" },
      { title: "BGP Community", href: "/policies/bgp-community" },
      { title: "BGP Extended Community", href: "/policies/bgp-extended-community" },
      { title: "BGP Large Community", href: "/policies/bgp-large-community" },
    ],
  },
  {
    title: "VPN",
    icon: Lock,
    children: [
      { title: "IPsec", href: "/vpn/ipsec" },
      { title: "WireGuard", href: "/vpn/wireguard" },
    ],
  },
  {
    title: "System",
    icon: Server,
    children: [
      { title: "Services", href: "/system/services" },
      { title: "Users", href: "/system/users" },
      { title: "Logs", href: "/system/logs" },
    ],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [openItems, setOpenItems] = useState<string[]>([]);
  const { data: session } = useSession();
  const { activeSession, loadSession, disconnectFromInstance } = useSessionStore();

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

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4 min-h-0">
        <nav className="space-y-1">
          {navigation.map((item) => {
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
