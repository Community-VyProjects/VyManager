"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
import { ProviderIcon, useProviderDescription } from "./ProviderIcon";
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
  const t = useTranslations("authentication");
  const tc = useTranslations("common");
  const describe = useProviderDescription();
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
  const isCustomOrSelfHosted = ["auth0", "okta", "keycloak", "authentik", "authelia", "custom-oidc"].includes(
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
      setError(t("form.clientIdRequired"));
      return;
    }
    if (!isEditing && !clientSecret.trim()) {
      setError(t("form.clientSecretRequired"));
      return;
    }
    if (isCustomOrSelfHosted && !discoveryUrl.trim()) {
      setError(t("form.discoveryRequired"));
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
      setError(err instanceof Error ? err.message : t("form.saveFailed"));
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
              <DialogTitle>{t("form.configureTitle", { name: provider.displayName })}</DialogTitle>
              <DialogDescription className="mt-0.5">
                {describe(provider)}
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
                {t("form.savedSuccess")}
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
                  {t("form.discoveryUrl")}{" "}
                  <span className="text-muted-foreground font-normal">
                    {t("form.discoveryHint")}
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
                    t("form.example", { url: "https://YOUR_DOMAIN.auth0.com/.well-known/openid-configuration" })}
                  {provider.providerId === "okta" &&
                    t("form.example", { url: "https://YOUR_DOMAIN.okta.com/.well-known/openid-configuration" })}
                  {provider.providerId === "keycloak" &&
                    t("form.example", { url: "https://keycloak.example.com/realms/REALM/.well-known/openid-configuration" })}
                  {provider.providerId === "authentik" &&
                    t("form.example", { url: "https://authentik.example.com/application/o/APP_SLUG/.well-known/openid-configuration" })}
                  {provider.providerId === "authelia" &&
                    t("form.example", { url: "https://auth.example.com/.well-known/openid-configuration" })}
                  {provider.providerId === "custom-oidc" &&
                    t("form.customOidcHint")}
                </p>
              </div>
            )}

            {/* Client ID */}
            <div className="space-y-1.5">
              <Label htmlFor="clientId">{t("form.clientId")}</Label>
              <Input
                id="clientId"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder={t("form.clientIdPlaceholder")}
                autoComplete="off"
              />
            </div>

            {/* Client Secret */}
            <div className="space-y-1.5">
              <Label htmlFor="clientSecret">
                {t("form.clientSecret")}
                {isEditing && (
                  <span className="text-muted-foreground font-normal ml-1">
                    {t("form.keepExisting")}
                  </span>
                )}
              </Label>
              <div className="relative">
                <Input
                  id="clientSecret"
                  type={showSecret ? "text" : "password"}
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder={isEditing ? "••••••••" : t("form.clientSecretPlaceholder")}
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
              <Label htmlFor="scopes">{t("form.scopes")}</Label>
              <Input
                id="scopes"
                value={scopes}
                onChange={(e) => setScopes(e.target.value)}
                // eslint-disable-next-line vymanager/no-untranslated-text -- OIDC scope values
                placeholder="openid email profile"
              />
              <p className="text-xs text-muted-foreground">{t("form.scopesHint")}</p>
            </div>

            {/* Advanced — manual endpoints */}
            {!isCustomOrSelfHosted && (
              <div className="border border-border rounded-lg">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>{t("form.advanced")}</span>
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
                        <Label htmlFor="advDiscoveryUrl">{t("form.advDiscoveryUrl")}</Label>
                        <Input
                          id="advDiscoveryUrl"
                          value={discoveryUrl}
                          onChange={(e) => setDiscoveryUrl(e.target.value)}
                          placeholder={provider.discoveryUrl ?? t("form.autoConfigured")}
                        />
                      </div>
                    )}
                    {requiresManualEndpoints && (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="authorizationUrl">{t("form.authorizationUrl")}</Label>
                          <Input
                            id="authorizationUrl"
                            value={authorizationUrl}
                            onChange={(e) => setAuthorizationUrl(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="tokenUrl">{t("form.tokenUrl")}</Label>
                          <Input
                            id="tokenUrl"
                            value={tokenUrl}
                            onChange={(e) => setTokenUrl(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="userInfoUrl">{t("form.userInfoUrl")}</Label>
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
                {tc("cancel")}
              </Button>
              <Button onClick={handleSave} disabled={saving || success}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {tc("saving")}
                  </>
                ) : isEditing ? (
                  t("form.update")
                ) : (
                  tc("save")
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
