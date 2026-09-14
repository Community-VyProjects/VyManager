"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/session-store";
import { shouldRedirectToSites } from "@/lib/appliance";

interface UseRequireInstanceOptions {
  /**
   * If true, automatically redirect to /sites if no instance is connected
   * If false, just return the connection status (for manual handling)
   */
  redirect?: boolean;
}

/**
 * useRequireInstance Hook
 *
 * Ensures a VyOS instance is connected before accessing a page.
 * Can either redirect to /sites or return status for manual handling.
 *
 * @example
 * // Auto-redirect if no instance
 * const { hasInstance, isLoading } = useRequireInstance({ redirect: true });
 *
 * @example
 * // Manual handling
 * const { hasInstance, isLoading } = useRequireInstance({ redirect: false });
 * if (!hasInstance) return <NoInstanceAlert />;
 */
export function useRequireInstance(options: UseRequireInstanceOptions = {}) {
  const { redirect = false } = options;
  const router = useRouter();
  const { activeSession, loadSession, isLoading } = useSessionStore();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      await loadSession();
      setHasChecked(true);
      const { activeSession: session, appliance } = useSessionStore.getState();
      if (redirect && shouldRedirectToSites(appliance, !!session)) {
        router.push("/sites");
      }
    };

    if (!hasChecked) {
      checkSession();
    }
  }, [activeSession, isLoading, loadSession, redirect, router, hasChecked]);

  return {
    hasInstance: !!activeSession,
    isLoading: isLoading || !hasChecked,
    activeSession,
  };
}
