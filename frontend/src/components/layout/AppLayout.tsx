"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageRefreshProvider, usePageRefresh } from "@/contexts/PageRefreshContext";
import { Sidebar } from "./Sidebar";
import { UnsavedChangesBanner } from "../config/UnsavedChangesBanner";
import { PowerActionBanner } from "../system/PowerActionBanner";
import { Toaster } from "../ui/toaster";
import { useSessionStore } from "@/store/session-store";
import { Loader2 } from "lucide-react";
import { UnifiedView } from "../ui/unified-view";
import { useUnifiedView } from "@/contexts/UnifiedViewContext";
import { useBannerEvents } from "@/hooks/useBannerEvents";


function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { activeSession, loadSession } = useSessionStore();
  const { refreshKey } = usePageRefresh();
  const [isChecking, setIsChecking] = useState(true);
  const { unifiedViewData, closeUnifiedView } = useUnifiedView();
  const bannerEvents = useBannerEvents();

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
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <PowerActionBanner powerStatus={bannerEvents.data.powerStatus} />
          <UnsavedChangesBanner configDiff={bannerEvents.data.configDiff} commitConfirm={bannerEvents.data.commitConfirm} />
          <div key={refreshKey} className="flex-1 min-h-0 overflow-y-auto">
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

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageRefreshProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </PageRefreshProvider>
  );
}
