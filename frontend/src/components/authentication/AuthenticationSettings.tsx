"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Settings,
  Trash2,
  CheckCircle2,
  XCircle,
  Plus,
  KeyRound,
} from "lucide-react";
import {
  oauthConfigService,
  OAuthProviderConfig,
  WELL_KNOWN_PROVIDERS,
} from "@/lib/api/oauth";
import { ProviderIcon } from "./ProviderIcon";
import { AddProviderModal } from "./AddProviderModal";
import { ConfigureProviderModal } from "./ConfigureProviderModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export function AuthenticationSettings() {
  const [configs, setConfigs] = useState<OAuthProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editProvider, setEditProvider] = useState<OAuthProviderConfig | null>(null);
  const [deleteProvider, setDeleteProvider] = useState<OAuthProviderConfig | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setConfigs(await oauthConfigService.listProviders());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load providers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  const handleToggle = async (provider: OAuthProviderConfig) => {
    setTogglingId(provider.providerId);
    try {
      await oauthConfigService.toggleProvider(provider.providerId, !provider.enabled);
      await loadConfigs();
    } catch (err) {
      console.error("Toggle failed:", err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteProvider) return;
    try {
      await oauthConfigService.deleteProvider(deleteProvider.providerId);
      await loadConfigs();
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleteProvider(null);
    }
  };

  const getProviderMeta = (providerId: string) =>
    WELL_KNOWN_PROVIDERS.find((p) => p.providerId === providerId);

  const editWellKnown = editProvider
    ? (getProviderMeta(editProvider.providerId) ?? {
        providerId: editProvider.providerId,
        displayName: editProvider.displayName,
        description: "Custom provider",
        defaultScopes: editProvider.scopes ?? "openid email profile",
        iconKey: "custom",
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Authentication</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure OAuth / OpenID Connect providers for single sign-on.
            Changes take effect immediately.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={loadConfigs}
            disabled={loading}
            className="h-9 w-9"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Provider
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : configs.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
            <KeyRound className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">No providers configured</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Add an OAuth provider to let users sign in with their existing accounts.
          </p>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Provider
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {configs.map((provider) => {
            const meta = getProviderMeta(provider.providerId);
            const iconKey = meta?.iconKey ?? "custom";
            const isToggling = togglingId === provider.providerId;

            return (
              <div
                key={provider.providerId}
                className={cn(
                  "relative rounded-xl border bg-card p-5 transition-all",
                  provider.enabled
                    ? "border-primary/40 shadow-sm shadow-primary/10"
                    : "border-border"
                )}
              >
                {/* Status badge */}
                <div className="absolute top-4 right-4">
                  {provider.enabled ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Enabled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      <XCircle className="h-3 w-3" />
                      Disabled
                    </span>
                  )}
                </div>

                {/* Icon + name */}
                <div className="flex items-center gap-3 mb-4 pr-24">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <ProviderIcon iconKey={iconKey} className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{provider.displayName}</p>
                    {meta && (
                      <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                        {meta.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5 text-xs"
                    onClick={() => setEditProvider(provider)}
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Edit
                  </Button>

                  <Button
                    size="sm"
                    variant={provider.enabled ? "secondary" : "outline"}
                    className="flex-1 text-xs"
                    disabled={isToggling}
                    onClick={() => handleToggle(provider)}
                  >
                    {isToggling ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : provider.enabled ? (
                      "Disable"
                    ) : (
                      "Enable"
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="px-2 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteProvider(provider)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add provider modal */}
      <AddProviderModal
        open={addOpen}
        onOpenChange={setAddOpen}
        existingProviderIds={configs.map((c) => c.providerId)}
        onSaved={loadConfigs}
      />

      {/* Edit modal */}
      {editProvider && editWellKnown && (
        <ConfigureProviderModal
          open={!!editProvider}
          onOpenChange={(open) => { if (!open) setEditProvider(null); }}
          provider={editWellKnown}
          existingConfig={editProvider}
          onSaved={loadConfigs}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteProvider} onOpenChange={(open) => { if (!open) setDeleteProvider(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove provider?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the <strong>{deleteProvider?.displayName}</strong> OAuth
              configuration. Users who signed in with this provider will keep their accounts
              but won&apos;t be able to use it to log in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
