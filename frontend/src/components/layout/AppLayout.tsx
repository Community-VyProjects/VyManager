"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Sidebar } from "./Sidebar";
import { UnsavedChangesBanner } from "../config/UnsavedChangesBanner";
import { PowerActionBanner } from "../system/PowerActionBanner";
import { Toaster } from "../ui/toaster";
import { useSessionStore } from "@/store/session-store";
import { Loader2, Menu } from "lucide-react";
import { UnifiedView } from "../ui/unified-view";
import { useUnifiedView } from "@/contexts/UnifiedViewContext";
import { useBannerEvents } from "@/hooks/useBannerEvents";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "../ui/sheet";


export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { activeSession, loadSession } = useSessionStore();
  const [isChecking, setIsChecking] = useState(true);
  const { unifiedViewData, closeUnifiedView } = useUnifiedView();
  const bannerEvents = useBannerEvents();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      // Load the current session
      await loadSession();
      setIsChecking(false);
    };

    checkSession();
  }, [loadSession]);

  // Redirect to sites page if no active instance
  useEffect(() => {
    if (!isChecking && !activeSession) {
      router.push("/sites");
    }
  }, [isChecking, activeSession, router]);

  // Show loading while checking session
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

  // Show nothing while redirecting (when no active session)
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

  // Render the layout only if user has an active session
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile top bar + sheet drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="flex lg:hidden items-center h-14 border-b border-border px-4 shrink-0 bg-card">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 ml-3">
            <Image
              src="/vy-icon.png"
              alt="VyOS Logo"
              width={28}
              height={28}
              className="object-contain"
              loader={({ src }) => src}
            />
            <span className="font-semibold text-foreground">VyManager</span>
          </div>
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

      {/* Unified View Dialog */}
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
