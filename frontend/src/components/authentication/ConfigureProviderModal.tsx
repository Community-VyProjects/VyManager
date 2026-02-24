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
} from "lucide-react";
import {
  oauthConfigService,
  WellKnownProvider,
  OAuthProviderConfig,
} from "@/lib/api/oauth";
import { ProviderIcon } from "./ProviderIcon";
import { CallbackUrlBox } from "./CallbackUrlBox";

interface ConfigureProviderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: WellKnownProvider;
  existingConfig?: OAuthProviderConfig | null;
  onSaved: () => void;
}

export function ConfigureProviderModal({
  open,
  onOpenChange,
  provider,
  existingConfig,
  onSaved,
}: ConfigureProviderModalProps) {
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
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isEditing = !!existingConfig;
  const isCustomOrSelfHosted = ["auth0", "okta", "keycloak", "authentik", "custom-oidc"].includes(
    provider.providerId
  );

  useEffect(() => {
    if (!open) {
      setError(null);
      setSuccess(false);
      setShowSecret(false);
      setShowAdvanced(false);
    }
  }, [open]);

  // When modal opens, fetch full config (including secret) if editing
  useEffect(() => {
    if (!open) return;

    // Pre-fill defaults from the well-known provider catalogue
    setDiscoveryUrl(provider.discoveryUrl ?? "");
    setAuthorizationUrl(
      provider.authorizationUrl ?? ""
    );
    setTokenUrl(provider.tokenUrl ?? "");
    setUserInfoUrl(provider.userInfoUrl ?? "");
    setScopes(provider.defaultScopes);
    setClientId("");
    setClientSecret("");

    if (existingConfig) {
      setLoadingExisting(true);
      oauthConfigService
        .getProvider(provider.providerId)
        .then((full) => {
          setClientId(full.clientId ?? "");
          setClientSecret(full.clientSecret ?? "");
          setDiscoveryUrl(full.discoveryUrl ?? provider.discoveryUrl ?? "");
          setAuthorizationUrl(full.authorizationUrl ?? "");
          setTokenUrl(full.tokenUrl ?? "");
          setUserInfoUrl(full.userInfoUrl ?? "");
          setScopes(full.scopes ?? provider.defaultScopes);
        })
        .catch(() => {
          setClientId(existingConfig.clientId ?? "");
          setDiscoveryUrl(existingConfig.discoveryUrl ?? provider.discoveryUrl ?? "");
        })
        .finally(() => setLoadingExisting(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, provider.providerId]);

  const handleSave = async () => {
    setError(null);
    if (!clientId.trim()) {
      setError("Client ID is required");
      return;
    }
    if (!isEditing && !clientSecret.trim()) {
      setError("Client Secret is required");
      return;
    }
    if (isCustomOrSelfHosted && !discoveryUrl.trim()) {
      setError("Discovery URL is required for this provider");
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await oauthConfigService.updateProvider(provider.providerId, {
          clientId: clientId.trim(),
          ...(clientSecret.trim() ? { clientSecret: clientSecret.trim() } : {}),
          discoveryUrl: discoveryUrl.trim() || undefined,
          authorizationUrl: authorizationUrl.trim() || undefined,
          tokenUrl: tokenUrl.trim() || undefined,
          userInfoUrl: userInfoUrl.trim() || undefined,
          scopes: scopes.trim() || undefined,
        });
      } else {
        await oauthConfigService.saveProvider({
          providerId: provider.providerId,
          displayName: provider.displayName,
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
          enabled: false, // enable separately via toggle
          discoveryUrl: discoveryUrl.trim() || undefined,
          authorizationUrl: authorizationUrl.trim() || undefined,
          tokenUrl: tokenUrl.trim() || undefined,
          userInfoUrl: userInfoUrl.trim() || undefined,
          scopes: scopes.trim() || undefined,
        });
      }
      setSuccess(true);
      setTimeout(() => {
        onSaved();
        onOpenChange(false);
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const requiresManualEndpoints = provider.requiresManualEndpoints ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <ProviderIcon iconKey={provider.iconKey} className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle>Configure {provider.displayName}</DialogTitle>
              <DialogDescription className="mt-0.5">
                {provider.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loadingExisting ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {/* Callback URL */}
            <CallbackUrlBox providerId={provider.providerId} />

            {/* Success */}
            {success && (
              <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Provider saved successfully
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Discovery URL — for self-hosted / custom providers */}
            {isCustomOrSelfHosted && (
              <div className="space-y-1.5">
                <Label htmlFor="discoveryUrl">
                  Discovery URL{" "}
                  <span className="text-muted-foreground font-normal">
                    (OIDC well-known endpoint)
                  </span>
                </Label>
                <Input
                  id="discoveryUrl"
                  value={discoveryUrl}
                  onChange={(e) => setDiscoveryUrl(e.target.value)}
                  placeholder="https://your-provider/.well-known/openid-configuration"
                />
                <p className="text-xs text-muted-foreground">
                  {provider.providerId === "auth0" &&
                    "Example: https://YOUR_DOMAIN.auth0.com/.well-known/openid-configuration"}
                  {provider.providerId === "okta" &&
                    "Example: https://YOUR_DOMAIN.okta.com/.well-known/openid-configuration"}
                  {provider.providerId === "keycloak" &&
                    "Example: https://keycloak.example.com/realms/REALM/.well-known/openid-configuration"}
                  {provider.providerId === "authentik" &&
                    "Example: https://authentik.example.com/application/o/APP_SLUG/.well-known/openid-configuration"}
                  {provider.providerId === "custom-oidc" &&
                    "The full URL to your provider's OpenID Connect discovery document"}
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
              <Label htmlFor="clientSecret">
                Client Secret
                {isEditing && (
                  <span className="text-muted-foreground font-normal ml-1">
                    (leave blank to keep existing)
                  </span>
                )}
              </Label>
              <div className="relative">
                <Input
                  id="clientSecret"
                  type={showSecret ? "text" : "password"}
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder={isEditing ? "••••••••" : "Paste your client secret here"}
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

            {/* Advanced — manual endpoints */}
            {!isCustomOrSelfHosted && (
              <div className="border border-border rounded-lg">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Advanced — override endpoints</span>
                  {showAdvanced ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
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
                          placeholder={provider.discoveryUrl ?? "Auto-configured"}
                        />
                      </div>
                    )}
                    {requiresManualEndpoints && (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="authorizationUrl">Authorization URL</Label>
                          <Input
                            id="authorizationUrl"
                            value={authorizationUrl}
                            onChange={(e) => setAuthorizationUrl(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="tokenUrl">Token URL</Label>
                          <Input
                            id="tokenUrl"
                            value={tokenUrl}
                            onChange={(e) => setTokenUrl(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="userInfoUrl">User Info URL</Label>
                          <Input
                            id="userInfoUrl"
                            value={userInfoUrl}
                            onChange={(e) => setUserInfoUrl(e.target.value)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || success}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : isEditing ? (
                  "Update"
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
