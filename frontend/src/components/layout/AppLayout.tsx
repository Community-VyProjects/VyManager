"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { Sidebar } from "./Sidebar";
import { UnsavedChangesBanner } from "../config/UnsavedChangesBanner";
import { PowerActionBanner } from "../system/PowerActionBanner";
import { Toaster } from "../ui/toaster";
import { useSessionStore } from "@/store/session-store";
import { Loader2, Menu, ChevronRight } from "lucide-react";
import { UnifiedView } from "../ui/unified-view";
import { useUnifiedView } from "@/contexts/UnifiedViewContext";
import { useBannerEvents } from "@/hooks/useBannerEvents";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "../ui/sheet";
import { navigation } from "@/lib/navigation";

function useBreadcrumbs() {
  const pathname = usePathname();

  return useMemo(() => {
    // Dashboard
    if (pathname === "/") return [{ label: "Dashboard" }];

    // Try matching against nav config
    for (const item of navigation) {
      if (item.href === pathname) {
        return [{ label: item.title }];
      }
      if (item.children) {
        for (const child of item.children) {
          if (pathname === child.href || pathname.startsWith(child.href + "/")) {
            return [{ label: item.title }, { label: child.title }];
          }
        }
      }
    }

    // Fallback: derive from path segments
    const segments = pathname.split("/").filter(Boolean);
    return segments.map((seg) => ({
      label: seg
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
    }));
  }, [pathname]);
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { activeSession, loadSession } = useSessionStore();
  const [isChecking, setIsChecking] = useState(true);
  const { unifiedViewData, closeUnifiedView } = useUnifiedView();
  const bannerEvents = useBannerEvents();
  const [mobileOpen, setMobileOpen] = useState(false);
  const breadcrumbs = useBreadcrumbs();

  useEffect(() => {
    const checkSession = async () => {
      await loadSession();
      setIsChecking(false);
    };

    checkSession();
  }, [loadSession]);

  useEffect(() => {
    if (!isChecking && !activeSession) {
      router.push("/sites");
    }
  }, [isChecking, activeSession, router]);

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!activeSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Redirecting to site manager...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile sheet drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar onNavigate={() => setMobileOpen(false)} forceMobile />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="flex lg:hidden items-center h-12 border-b border-border px-4 shrink-0 bg-card">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 ml-3">
            <Image
              src="/vy-icon.png"
              alt="VyOS Logo"
              width={24}
              height={24}
              className="object-contain"
              loader={({ src }) => src}
            />
            <span className="text-sm font-semibold text-foreground">VyManager</span>
          </div>
        </div>

        {/* Desktop top bar with breadcrumbs */}
        <div className="hidden lg:flex items-center h-10 border-b border-border px-4 shrink-0 bg-card/50">
          <nav className="flex items-center text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 mx-1.5 text-muted-foreground/50" />}
                <span className={i === breadcrumbs.length - 1 ? "text-foreground font-medium" : ""}>
                  {crumb.label}
                </span>
              </span>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <PowerActionBanner powerStatus={bannerEvents.data.powerStatus} />
          <UnsavedChangesBanner configDiff={bannerEvents.data.configDiff} commitConfirm={bannerEvents.data.commitConfirm} />
          <div className="flex-1 min-h-0 overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
      <Toaster />

      {unifiedViewData && (
        <UnifiedView
          isOpen={!!unifiedViewData}
          onClose={closeUnifiedView}
          type={unifiedViewData.type}
          data={unifiedViewData.data}
        />
      )}
    </div>
  );
}
