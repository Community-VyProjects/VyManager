"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Network, Activity, Server, Github, Globe, MessageCircle, Sparkles } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useSessionStore } from "@/store/session-store";

export default function Home() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const { data: session, isPending } = useSession();
  const { activeSession, loadSession } = useSessionStore();

  useEffect(() => {
    const checkAndRedirect = async () => {
      // Wait for session check to complete
      if (isPending) {
        return;
      }

      // Not authenticated - check onboarding
      if (!session?.user) {
        try {
          const response = await fetch(`/api/session/onboarding-status`, {
            method: "GET",
          });

          if (!response.ok) {
            console.error("[RootPage] Onboarding status check failed:", response.status);
            router.push("/login");
            return;
          }

          const data = await response.json();

          if (data.needs_onboarding) {
            console.log("[RootPage] Onboarding needed - redirecting to /onboarding");
            router.push("/onboarding");
          } else {
            console.log("[RootPage] Onboarding complete - redirecting to /login");
            router.push("/login");
          }
        } catch (err) {
          console.error("[RootPage] Failed to check onboarding status:", err);
          router.push("/login");
        }
        return;
      }

      // User is authenticated - check if they have an active VyOS instance connection
      await loadSession();
      setIsChecking(false);
    };

    checkAndRedirect();
  }, [router, session, isPending, loadSession]);

  // Still checking session
  if (isPending || isChecking) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // User is authenticated - show dashboard
  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome to VyManager - Professional VyOS Management Interface
          </p>

          {/* Beta Information Card */}
          <div className="mt-6 relative overflow-hidden rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 via-purple-500/5 to-cyan-500/5 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
            <div className="relative p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Open Beta</span>
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Github className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Development by</span>
                  <a
                    href="https://github.com/Community-VyProjects/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 font-medium transition-colors underline decoration-primary/30 hover:decoration-primary/60"
                  >
                    VyProjects Org
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href="https://vyprojects.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 font-medium transition-colors underline decoration-primary/30 hover:decoration-primary/60"
                  >
                    Website
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Join our</span>
                  <a
                    href="https://discord.gg/4mE6QsZtKm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-500 hover:text-purple-400 font-medium transition-colors underline decoration-purple-500/30 hover:decoration-purple-500/60"
                  >
                    Discord
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Firewall Rules</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">Active rules configured</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Network Interfaces</CardTitle>
              <Network className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4</div>
              <p className="text-xs text-muted-foreground">Interfaces online</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Online</div>
              <p className="text-xs text-muted-foreground">All services running</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23%</div>
              <p className="text-xs text-muted-foreground">System resources</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
