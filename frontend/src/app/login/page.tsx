"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { signIn, signOut, authClient } from "@/lib/auth-client";
import { Shield, Loader2, AlertCircle } from "lucide-react";
import { sessionService, AuthSessionInfo } from "@/lib/api/session";
import { ActiveSessionWarningModal } from "@/components/auth/ActiveSessionWarningModal";
import { OAuthProviderConfig } from "@/lib/api/oauth";
import { ProviderIcon } from "@/components/authentication/ProviderIcon";
import { WELL_KNOWN_PROVIDERS } from "@/lib/api/oauth";

// DEMO: Demo subdomain detection (see DEMO.md for removal)
function getDemoSlug(): string | null {
  if (typeof window === "undefined") return null;
  const hostname = window.location.hostname;
  const baseDomain = process.env.NEXT_PUBLIC_DEMO_BASE_DOMAIN || "";
  if (!baseDomain || !hostname.endsWith(`.${baseDomain}`)) return null;
  const subdomain = hostname.replace(`.${baseDomain}`, "");
  if (subdomain && subdomain !== hostname) return subdomain;
  return null;
}
// DEMO: End getDemoSlug

export default function LoginPage() {
  const router = useRouter();
  const [from, setFrom] = useState<string>("/sites");
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [demoSlug] = useState<string | null>(getDemoSlug); // DEMO: demo slug state

  // Check if onboarding is needed first
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        // Use the frontend proxy instead of direct backend access
        // This works around Docker networking issues where browser can't access backend directly
        const response = await fetch(`/api/session/onboarding-status`, {
          method: "GET",
        });

        if (!response.ok) {
          console.error("[LoginPage] Onboarding status check failed:", response.status);
          setCheckingOnboarding(false);
          return;
        }

        const data = await response.json();

        if (data.needs_onboarding) {
          console.log("[LoginPage] Onboarding needed - redirecting to /onboarding");
          router.push("/onboarding");
          return;
        }
        console.log("[LoginPage] Onboarding complete - showing login");
      } catch (err) {
        console.error("[LoginPage] Failed to check onboarding status:", err);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, [router]);

  // Read search params on the client only so we don't call
  // `useSearchParams` during prerendering (avoids Next build error).
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const f = params.get("from");
      // Default to /sites if no "from" parameter or if it's the login page
      if (f && f !== "/login" && f !== "/onboarding") {
        setFrom(f);
      }
    } catch (err) {
      // ignore
    }
  }, []);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [otherSessions, setOtherSessions] = useState<AuthSessionInfo[]>([]);

  // OAuth providers
  const [oauthProviders, setOauthProviders] = useState<OAuthProviderConfig[]>([]);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/oauth-config/public")
      .then((r) => (r.ok ? r.json() : { providers: [] }))
      .then((data) => setOauthProviders(data.providers ?? []))
      .catch(() => setOauthProviders([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Sign in
      const result = await signIn.email({
        email: formData.email,
        password: formData.password,
      });

      if (result.error) {
        setError(result.error.message || "Login failed");
        setIsLoading(false);
        return;
      }

      // Check for active sessions after successful login
      // Wait a moment for the session cookie to be fully established
      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        const sessionsResponse = await sessionService.getActiveSessions();

        if (sessionsResponse.has_other_sessions) {
          // Show the active session warning modal
          setOtherSessions(sessionsResponse.other_sessions);
          setShowSessionWarning(true);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.error("Failed to check active sessions:", err);
        // Continue with login even if session check fails
        // This shouldn't block the login process
      }

      // No other sessions, proceed to redirect
      router.push(from);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  const handleContinueAndRevokeOtherSessions = async () => {
    try {
      // Revoke all other sessions
      for (const session of otherSessions) {
        await sessionService.revokeSession(session.token);
      }

      // Proceed to redirect
      router.push(from);
      router.refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to revoke other sessions";
      throw new Error(errorMessage);
    }
  };

  const handleOAuthSignIn = async (providerId: string) => {
    setError("");
    setOauthLoading(providerId);
    try {
      await authClient.signIn.oauth2({
        providerId,
        callbackURL: from,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "OAuth sign-in failed");
      setOauthLoading(null);
    }
  };

  const handleCancelLogin = async () => {
    // User chose to cancel - log them out
    try {
      await signOut();
      setShowSessionWarning(false);
      setOtherSessions([]);
      setError("Login cancelled. Please try again from your other device or choose to continue.");
    } catch (err) {
      console.error("Failed to sign out:", err);
      setError("Login cancelled");
    }
  };

  // Show loading while checking if onboarding is needed
  if (checkingOnboarding) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-cyan-400/20 opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-cyan-400/30 via-transparent to-transparent opacity-40" />

      {/* Animated grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Glass morphism card */}
        <div className="backdrop-blur-xl bg-card/50 border border-border/50 rounded-2xl shadow-2xl p-8">
          {/* Logo and title */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-20 h-20 mb-4">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 blur-xl" />
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-lg shadow-primary/10">
                <img
                  src="/vy-icon.png"
                  alt="VyManager Logo"
                  width={80}
                  height={80}
                  className="object-contain"
                />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              VyManager
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {demoSlug ? "Demo Environment" : "Professional VyOS Management"}{/* DEMO: conditional text */}
            </p>
          </div>

          {/* DEMO: Demo banner (see DEMO.md for removal) */}
          {demoSlug && (
            <div className="mb-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-center">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Demo: {demoSlug}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Log in with your demo credentials
              </p>
            </div>
          )}
          {/* DEMO: End demo banner */}

          {/* Error message */}
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/50 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@vymanager.local"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                className="h-11 bg-background/50 border-border/50 focus:border-primary transition-colors"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                className="h-11 bg-background/50 border-border/50 focus:border-primary transition-colors"
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={formData.rememberMe}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, rememberMe: checked as boolean })
                  }
                  disabled={isLoading}
                />
                <label
                  htmlFor="remember"
                  className="text-sm text-muted-foreground cursor-pointer select-none"
                >
                  Remember me
                </label>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg shadow-primary/20 transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>

          </form>

          {/* OAuth provider buttons */}
          {oauthProviders.length > 0 && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card/80 px-2 text-muted-foreground backdrop-blur-sm">
                    or continue with
                  </span>
                </div>
              </div>

              <div className="grid gap-2" style={{ gridTemplateColumns: oauthProviders.length === 1 ? "1fr" : "repeat(2, 1fr)" }}>
                {oauthProviders.map((provider) => {
                  const meta = WELL_KNOWN_PROVIDERS.find((p) => p.providerId === provider.providerId);
                  const iconKey = meta?.iconKey ?? "custom";
                  return (
                    <Button
                      key={provider.providerId}
                      type="button"
                      variant="outline"
                      className="h-11 gap-2 bg-background/50 border-border/50"
                      disabled={!!oauthLoading || isLoading}
                      onClick={() => handleOAuthSignIn(provider.providerId)}
                    >
                      {oauthLoading === provider.providerId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ProviderIcon iconKey={iconKey} className="h-4 w-4" />
                      )}
                      <span className="text-sm">{provider.displayName}</span>
                    </Button>
                  );
                })}
              </div>
            </>
          )}

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Secure Access
              </span>
            </div>
          </div>

          {/* Footer info */}
          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              Protected by enterprise-grade encryption
            </p>
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground/60">
              <Shield className="w-3 h-3" />
              <span>VyOS Router Management System</span>
            </div>
          </div>
        </div>

        {/* Bottom text */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>

      {/* Active Session Warning Modal */}
      <ActiveSessionWarningModal
        open={showSessionWarning}
        onOpenChange={setShowSessionWarning}
        sessions={otherSessions}
        onContinue={handleContinueAndRevokeOtherSessions}
        onCancel={handleCancelLogin}
      />
    </div>
  );
}
