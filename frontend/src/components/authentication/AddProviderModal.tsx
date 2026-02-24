"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import {
  oauthConfigService,
  WELL_KNOWN_PROVIDERS,
  WellKnownProvider,
  OAuthProviderConfig,
} from "@/lib/api/oauth";
import { ProviderIcon } from "./ProviderIcon";
import { CallbackUrlBox } from "./CallbackUrlBox";
import { cn } from "@/lib/utils";

interface AddProviderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingProviderIds: string[];
  onSaved: () => void;
}

export function AddProviderModal({
  open,
  onOpenChange,
  existingProviderIds,
  onSaved,
}: AddProviderModalProps) {
  const [step, setStep] = useState<"pick" | "configure">("pick");
  const [selected, setSelected] = useState<WellKnownProvider | null>(null);

  // Config form state
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [discoveryUrl, setDiscoveryUrl] = useState("");
  const [authorizationUrl, setAuthorizationUrl] = useState("");
  const [tokenUrl, setTokenUrl] = useState("");
  const [userInfoUrl, setUserInfoUrl] = useState("");
  const [scopes, setScopes] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset when modal opens/closes
  useEffect(() => {
    if (!open) {
      setStep("pick");
      setSelected(null);
      setClientId("");
      setClientSecret("");
      setDiscoveryUrl("");
      setAuthorizationUrl("");
      setTokenUrl("");
      setUserInfoUrl("");
      setScopes("");
      setShowAdvanced(false);
      setShowSecret(false);
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  const availableProviders = WELL_KNOWN_PROVIDERS.filter(
    (p) => !existingProviderIds.includes(p.providerId)
  );

  const handleSelectProvider = (provider: WellKnownProvider) => {
    setSelected(provider);
    setDiscoveryUrl(provider.discoveryUrl ?? "");
    setAuthorizationUrl(
      (provider as WellKnownProvider & { authorizationUrl?: string }).authorizationUrl ?? ""
    );
    setTokenUrl(
      (provider as WellKnownProvider & { tokenUrl?: string }).tokenUrl ?? ""
    );
    setUserInfoUrl(
      (provider as WellKnownProvider & { userInfoUrl?: string }).userInfoUrl ?? ""
    );
    setScopes(provider.defaultScopes);
    setStep("configure");
  };

  const handleBack = () => {
    setStep("pick");
    setSelected(null);
    setError(null);
  };

  const isCustomOrSelfHosted = selected
    ? ["auth0", "okta", "keycloak", "authentik", "custom-oidc"].includes(selected.providerId)
    : false;

  const requiresManualEndpoints = selected?.requiresManualEndpoints ?? false;

  const handleSave = async () => {
    if (!selected) return;
    setError(null);

    if (!clientId.trim()) { setError("Client ID is required"); return; }
    if (!clientSecret.trim()) { setError("Client Secret is required"); return; }
    if (isCustomOrSelfHosted && !discoveryUrl.trim()) {
      setError("Discovery URL is required for this provider");
      return;
    }

    setSaving(true);
    try {
      await oauthConfigService.saveProvider({
        providerId: selected.providerId,
        displayName: selected.displayName,
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        enabled: false,
        discoveryUrl: discoveryUrl.trim() || undefined,
        authorizationUrl: authorizationUrl.trim() || undefined,
        tokenUrl: tokenUrl.trim() || undefined,
        userInfoUrl: userInfoUrl.trim() || undefined,
        scopes: scopes.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        onSaved();
        onOpenChange(false);
      }, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save provider");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto", step === "pick" ? "sm:max-w-3xl" : "sm:max-w-lg")}>
        {/* ── Step 1: pick a provider ── */}
        {step === "pick" && (
          <>
            <DialogHeader>
              <DialogTitle>Add Authentication Provider</DialogTitle>
              <DialogDescription>
                Choose a provider to configure single sign-on for your users.
              </DialogDescription>
            </DialogHeader>

            {availableProviders.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                All available providers are already configured.
              </p>
            ) : (
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {availableProviders.map((provider) => (
                  <button
                    key={provider.providerId}
                    onClick={() => handleSelectProvider(provider)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border border-border px-4 py-3",
                      "text-left transition-all hover:border-primary/50 hover:bg-accent/50",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    )}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                      <ProviderIcon iconKey={provider.iconKey} className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{provider.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">{provider.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Step 2: configure ── */}
        {step === "configure" && selected && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <button
                  onClick={handleBack}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <ProviderIcon iconKey={selected.iconKey} className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle>Configure {selected.displayName}</DialogTitle>
                  <DialogDescription className="mt-0.5">{selected.description}</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {/* Callback URL — must be registered in the provider first */}
              <CallbackUrlBox providerId={selected.providerId} />

              {success && (
                <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Provider saved — enable it to show on the login page.
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Discovery URL for self-hosted providers */}
              {isCustomOrSelfHosted && (
                <div className="space-y-1.5">
                  <Label htmlFor="discoveryUrl">
                    Discovery URL{" "}
                    <span className="text-muted-foreground font-normal">(OIDC well-known endpoint)</span>
                  </Label>
                  <Input
                    id="discoveryUrl"
                    value={discoveryUrl}
                    onChange={(e) => setDiscoveryUrl(e.target.value)}
                    placeholder="https://your-provider/.well-known/openid-configuration"
                  />
                  <p className="text-xs text-muted-foreground">
                    {selected.providerId === "auth0" && "Example: https://YOUR_DOMAIN.auth0.com/.well-known/openid-configuration"}
                    {selected.providerId === "okta" && "Example: https://YOUR_DOMAIN.okta.com/.well-known/openid-configuration"}
                    {selected.providerId === "keycloak" && "Example: https://keycloak.example.com/realms/REALM/.well-known/openid-configuration"}
                    {selected.providerId === "authentik" && "Example: https://authentik.example.com/application/o/APP_SLUG/.well-known/openid-configuration"}
                    {selected.providerId === "custom-oidc" && "The full URL to your provider's OpenID Connect discovery document"}
                  </p>
                </div>
              )}

              {/* Client ID */}
              <div className="space-y-1.5">
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Paste your client ID here"
                  autoComplete="off"
                />
              </div>

              {/* Client Secret */}
              <div className="space-y-1.5">
                <Label htmlFor="clientSecret">Client Secret</Label>
                <div className="relative">
                  <Input
                    id="clientSecret"
                    type={showSecret ? "text" : "password"}
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="Paste your client secret here"
                    autoComplete="off"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Scopes */}
              <div className="space-y-1.5">
                <Label htmlFor="scopes">Scopes</Label>
                <Input
                  id="scopes"
                  value={scopes}
                  onChange={(e) => setScopes(e.target.value)}
                  placeholder="openid email profile"
                />
                <p className="text-xs text-muted-foreground">Space-separated list of OAuth scopes</p>
              </div>

              {/* Advanced */}
              {!isCustomOrSelfHosted && (
                <div className="border border-border rounded-lg">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>Advanced — override endpoints</span>
                    {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {showAdvanced && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                      {!requiresManualEndpoints && (
                        <div className="space-y-1.5">
                          <Label htmlFor="advDiscoveryUrl">Discovery URL (OIDC)</Label>
                          <Input
                            id="advDiscoveryUrl"
                            value={discoveryUrl}
                            onChange={(e) => setDiscoveryUrl(e.target.value)}
                            placeholder={selected.discoveryUrl ?? "Auto-configured"}
                          />
                        </div>
                      )}
                      {requiresManualEndpoints && (
                        <>
                          <div className="space-y-1.5">
                            <Label>Authorization URL</Label>
                            <Input value={authorizationUrl} onChange={(e) => setAuthorizationUrl(e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Token URL</Label>
                            <Input value={tokenUrl} onChange={(e) => setTokenUrl(e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <Label>User Info URL</Label>
                            <Input value={userInfoUrl} onChange={(e) => setUserInfoUrl(e.target.value)} />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving || success}>
                  {saving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
                  ) : (
                    "Save Provider"
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
