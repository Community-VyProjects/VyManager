"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import localFont from "next/font/local";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/ui/language-selector";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, authClient } from "@/lib/auth-client";
import { signOutFully } from "@/lib/logout";
import { Loader2, AlertCircle } from "lucide-react";
import { sessionService, AuthSessionInfo } from "@/lib/api/session";
import { afterLoginPath } from "@/lib/appliance";
import { ActiveSessionWarningModal } from "@/components/auth/ActiveSessionWarningModal";
import { TwoFactorChallenge } from "@/components/auth/TwoFactorChallenge";
import { TwoFactorEnrollForm } from "@/components/auth/TwoFactorEnrollForm";
import { OAuthProviderConfig } from "@/lib/api/oauth";
import { ProviderIcon } from "@/components/authentication/ProviderIcon";
import { WELL_KNOWN_PROVIDERS } from "@/lib/api/oauth";
import { interpretSignInResult, leftoverPasswordSessions, mustEnrollTwoFactor, parseTwoFactorQuery } from "@/lib/two-factor";
import { VortexCanvas, type VortexHandle } from "@/components/login/VortexCanvas";
import styles from "@/components/login/login.module.css";

// Served from the repo, so the page has no call out to a font CDN. Routers are
// often managed from networks that cannot reach one.
const manrope = localFont({
  src: "./manrope-latin-wght-normal.woff2",
  weight: "200 800",
  display: "swap",
});

const SHAKE: Keyframe[] = [
  { transform: "translateX(0)" },
  { transform: "translateX(-7px)", offset: 0.2 },
  { transform: "translateX(6px)", offset: 0.4 },
  { transform: "translateX(-4px)", offset: 0.6 },
  { transform: "translateX(2px)", offset: 0.8 },
  { transform: "translateX(0)" },
];

export default function LoginPage() {
  const t = useTranslations("login");
  const tm = useTranslations("miscLib");
  const router = useRouter();
  const [appliance, setAppliance] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [forceEnroll, setForceEnroll] = useState(false);
  const [host, setHost] = useState("");
  const [leaving, setLeaving] = useState(false);
  const vortex = useRef<VortexHandle>(null);

  useEffect(() => {
    setHost(window.location.host);
  }, []);

  // Check if onboarding is needed first
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        // Use the frontend proxy instead of direct backend access
        // This works around Docker networking issues where browser can't access backend directly
        const data = await sessionService.getOnboardingStatus();

        if (data.needs_onboarding) {
          console.log("[LoginPage] Onboarding needed - redirecting to /onboarding");
          router.push("/onboarding");
          return;
        }
        const applianceMode = data.appliance === true;
        setAppliance(applianceMode);
        const existing = await authClient.getSession();
        if (existing.data?.user) {
          try {
            const policy = await sessionService.getTwoFactorPolicy();
            const enrolled = Boolean(
              (existing.data.user as { twoFactorEnabled?: boolean }).twoFactorEnabled,
            );
            if (mustEnrollTwoFactor({ twoFactorEnabled: enrolled, requireTwoFactor: policy.require_two_factor })) {
              setForceEnroll(true);
              return;
            }
          } catch {
            /* if policy cannot be read, do not trap them on login */
          }
          router.replace(afterLoginPath(applianceMode));
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
  const [twoFactorMethods, setTwoFactorMethods] = useState<string[] | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      // A failed OAuth callback redirects back here with ?error=oauth.
      if (params.get("error")) {
        setError(t("errors.ssoDenied"));
        setErrorSeq((n) => n + 1);
      }
      const twoFactor = parseTwoFactorQuery(window.location.search);
      if (twoFactor.challenge) {
        setTwoFactorMethods(twoFactor.methods);
      }
    } catch {
      // ignore
    }
  }, [t]);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  // Counts failures, so a repeat of the same message still gets feedback.
  const [errorSeq, setErrorSeq] = useState(0);
  const refocusPassword = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    vortex.current?.setBusy(isLoading || !!oauthLoading);
  }, [isLoading, oauthLoading]);

  const showError = (message: string, { retryPassword = false } = {}) => {
    setError(message);
    setErrorSeq((n) => n + 1);
    refocusPassword.current = retryPassword;
  };

  useEffect(() => {
    if (!errorSeq) return;
    vortex.current?.fail();
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      formRef.current?.animate(SHAKE, { duration: 420, easing: "cubic-bezier(0.36, 0.07, 0.19, 0.97)" });
    }
    if (refocusPassword.current) {
      refocusPassword.current = false;
      passwordRef.current?.focus();
      passwordRef.current?.select();
    }
  }, [errorSeq]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn.email({
        email: formData.email,
        password: formData.password,
      });

      const outcome = interpretSignInResult(result);
      if (outcome.kind === "error") {
        showError(outcome.messageKey ? tm(outcome.messageKey) : outcome.message, { retryPassword: true });
        setIsLoading(false);
        return;
      }
      if (outcome.kind === "twoFactor") {
        setTwoFactorMethods(outcome.methods);
        setIsLoading(false);
        return;
      }

      await finishLogin();
    } catch (err) {
      showError(err instanceof Error ? err.message : t("errors.generic"), { retryPassword: true });
      setIsLoading(false);
    }
  };

  const finishLogin = async (fromTwoFactor = false) => {
    const sess = await authClient.getSession();
    try {
      const policy = await sessionService.getTwoFactorPolicy();
      const enrolled = Boolean(
        (sess.data?.user as { twoFactorEnabled?: boolean } | undefined)?.twoFactorEnabled,
      );
      if (mustEnrollTwoFactor({ twoFactorEnabled: enrolled, requireTwoFactor: policy.require_two_factor })) {
        setForceEnroll(true);
        setIsLoading(false);
        return;
      }
    } catch {
      /* continue */
    }

    try {
      const sessionsResponse = await sessionService.getActiveSessions();

      if (sessionsResponse.has_other_sessions) {
        let others = sessionsResponse.other_sessions;
        if (fromTwoFactor) {
          const ghosts = leftoverPasswordSessions(others, {
            currentUserAgent: sessionsResponse.current_user_agent,
          });
          const ghostTokens = new Set(ghosts.map((s) => s.token));
          others = others.filter((s) => !ghostTokens.has(s.token));
        }
        if (others.length > 0) {
          setOtherSessions(others);
          setShowSessionWarning(true);
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.error("Failed to check active sessions:", err);
    }

    await enterApp();
  };

  const enterApp = async () => {
    setLeaving(true);
    await vortex.current?.succeed();
    router.push(afterLoginPath(appliance));
  };

  const handleContinueAndRevokeOtherSessions = async () => {
    try {
      // Revoke all other sessions
      for (const session of otherSessions) {
        await sessionService.revokeSession(session.token);
      }

      // Proceed to redirect, with the prompt out of the way of the exit.
      setShowSessionWarning(false);
      await enterApp();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("errors.revokeFailed");
      throw new Error(errorMessage);
    }
  };

  const handleOAuthSignIn = async (providerId: string) => {
    setError("");
    setOauthLoading(providerId);
    try {
      await authClient.signIn.social({
        provider: providerId,
        callbackURL: afterLoginPath(appliance),
        // On a failed callback (e.g. role mapping denies access because the
        // account is in no permitted group) return to the login page with a
        // friendly message instead of a raw 500.
        errorCallbackURL: "/login?error=oauth",
      });
    } catch (err) {
      showError(err instanceof Error ? err.message : t("errors.oauthFailed"));
      setOauthLoading(null);
    }
  };

  const handleCancelLogin = async () => {
    try {
      await signOutFully();
      setShowSessionWarning(false);
      setOtherSessions([]);
      setLeaving(false);
      showError(t("errors.loginCancelledRetry"));
    } catch (err) {
      console.error("Failed to sign out:", err);
      showError(t("errors.loginCancelled"));
    }
  };

  // The background plays while onboarding is checked, so there is no spinner.
  const showForm = !checkingOnboarding;

  return (
    <div className={`${styles.page} ${leaving ? styles.leaving : ""}`}>
      <VortexCanvas ref={vortex} alt={t("logoAlt")} />

      {/* inert while leaving: the faded form must not be focused or submitted again. */}
      <div className={styles.language} inert={leaving}>
        <LanguageSelector compact />
      </div>

      <main className={styles.layout} inert={leaving}>
        <div className={styles.brand}>
          <p className={`${styles.wordmark} ${manrope.className}`}>VyManager</p>
          <p className={styles.tagline}>{t("subtitle")}</p>
        </div>

        <div className={styles.column}>
          {showForm && (
            <>
              <div className={styles.panel}>
                <h1 className={`${styles.heading} ${manrope.className}`}>{t("signIn")}</h1>
                <p className={styles.host}>
                  {host && t.rich("connectingTo", { host, strong: (chunks) => <strong>{chunks}</strong> })}
                </p>

                {error && (
                  <div className={styles.error} role="alert">
                    <AlertCircle aria-hidden="true" />
                    <p>{error}</p>
                  </div>
                )}

                {forceEnroll ? (
                  <>
                    <p className={styles.prompt}>{t("twoFactorRequired")}</p>
                    <TwoFactorEnrollForm
                      password={formData.password}
                      onDone={() => finishLogin(true)}
                    />
                  </>
                ) : twoFactorMethods ? (
                  <>
                    <p className={styles.prompt}>{t("twoFactorPrompt")}</p>
                    <TwoFactorChallenge
                      methods={twoFactorMethods}
                      onVerified={() => finishLogin(true)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-2 w-full"
                      onClick={() => {
                        setTwoFactorMethods(null);
                        setError("");
                      }}
                    >
                      {t("backToPassword")}
                    </Button>
                  </>
                ) : (
                  <form ref={formRef} onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.field}>
                      <Label htmlFor="email">{t("email")}</Label>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="username"
                        autoFocus
                        placeholder="admin@vymanager.local"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          vortex.current?.pulse();
                        }}
                        required
                        disabled={isLoading}
                      />
                    </div>

                    <div className={styles.field}>
                      <Label htmlFor="password">{t("password")}</Label>
                      <Input
                        ref={passwordRef}
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        value={formData.password}
                        onChange={(e) => {
                          setFormData({ ...formData, password: e.target.value });
                          vortex.current?.pulse();
                        }}
                        required
                        disabled={isLoading}
                      />
                    </div>

                    <Button type="submit" className={styles.submit} disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          {t("signingIn")}
                        </>
                      ) : (
                        t("signIn")
                      )}
                    </Button>
                  </form>
                )}

                {/* OAuth provider buttons */}
                {oauthProviders.length > 0 && !twoFactorMethods && (
                  <div className={styles.alternatives}>
                    <p className={styles.alternativesLabel}>{t("orContinueWith")}</p>
                    <div className={styles.providers} data-many={oauthProviders.length > 1}>
                      {oauthProviders.map((provider) => {
                        const meta = WELL_KNOWN_PROVIDERS.find((p) => p.providerId === provider.providerId);
                        const iconKey = meta?.iconKey ?? "custom";
                        return (
                          <Button
                            key={provider.providerId}
                            type="button"
                            variant="outline"
                            className={styles.provider}
                            disabled={!!oauthLoading || isLoading}
                            onClick={() => handleOAuthSignIn(provider.providerId)}
                          >
                            {oauthLoading === provider.providerId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ProviderIcon iconKey={iconKey} className="h-4 w-4" />
                            )}
                            <span>{provider.displayName}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            </>
          )}
        </div>
      </main>

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
