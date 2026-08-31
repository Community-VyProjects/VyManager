"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { UnsavedChangesBanner } from "../config/UnsavedChangesBanner";
import { PowerActionBanner } from "../system/PowerActionBanner";
import { Toaster } from "../ui/toaster";
import { useSessionStore } from "@/store/session-store";
import { Loader2 } from "lucide-react";
import { UnifiedView } from "../ui/unified-view";
import { useUnifiedView } from "@/contexts/UnifiedViewContext";
import { useBannerEvents } from "@/hooks/useBannerEvents";
import { ErrorBoundary } from "../error/ErrorBoundary";
import { installGlobalErrorCapture } from "@/lib/error-capture";


interface AppLayoutProps {
  children: React.ReactNode;
  /**
   * Render the layout even when no VyOS instance session is active instead of
   * redirecting to the site manager. Used by pages that provide their own
   * disconnected state (currently the dashboard's zero-instance panel).
   */
  allowWithoutInstance?: boolean;
}

const AppLayoutContext = createContext(false);

function isPublicRoute(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/onboarding") || pathname === "/sites";
}

function AppLayoutInner({ children, allowWithoutInstance = false }: AppLayoutProps) {
  const router = useRouter();
  const { activeSession, loadSession } = useSessionStore();
  const [isChecking, setIsChecking] = useState(true);
  const { unifiedViewData, closeUnifiedView } = useUnifiedView();
  const bannerEvents = useBannerEvents();

  // Start capturing uncaught errors/rejections so the bug reporter can attach them.
  useEffect(() => {
    installGlobalErrorCapture();
  }, []);

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
    if (!isChecking && !activeSession && !allowWithoutInstance) {
      router.push("/sites");
    }
  }, [isChecking, activeSession, allowWithoutInstance, router]);

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
  if (!activeSession && !allowWithoutInstance) {
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
          <div className="flex-1 min-h-0 overflow-y-auto">
            <ErrorBoundary>{children}</ErrorBoundary>
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

export function AppLayout({ children, allowWithoutInstance }: AppLayoutProps) {
  const pathname = usePathname();
  const isNestedLayout = useContext(AppLayoutContext);

  if (isNestedLayout || isPublicRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <AppLayoutContext.Provider value>
      <AppLayoutInner
        allowWithoutInstance={allowWithoutInstance ?? pathname === "/"}
      >
        {children}
      </AppLayoutInner>
    </AppLayoutContext.Provider>
  );
}
