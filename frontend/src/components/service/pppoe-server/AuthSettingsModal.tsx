"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Key, Loader2 } from "lucide-react";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { pppoeServerService, PPPoEAuthentication, PPPoECapabilities } from "@/lib/api/pppoe-server";
import { authProblem, type PPPoEAuthDraft } from "@/lib/api/pppoe-server-save-ops";
import type { ApiError } from "@/lib/types/api";

interface AuthSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  currentAuth: PPPoEAuthentication;
  capabilities: PPPoECapabilities | null;
}

/** Labels for the `authentication mode` values; the page badge reads the same map. */
export function authModeLabels(
  t: (key: "auth.modeLocal" | "auth.modeRadius" | "auth.modeNoauth") => string,
): Record<string, string> {
  return {
    local: t("auth.modeLocal"),
    radius: t("auth.modeRadius"),
    noauth: t("auth.modeNoauth"),
  };
}

export function AuthSettingsModal({ open, onOpenChange, onSuccess, currentAuth, capabilities }: AuthSettingsModalProps) {
  const t = useTranslations("pppoeServerSettings");
  const tc = useTranslations("common");
  // The page remounts this modal (key) on every open, so state seeds from props.
  // An empty mode is the unset leaf (the lab default); choosing it deletes the mode.
  const [draft, setDraft] = useState<PPPoEAuthDraft>(() => ({
    mode: currentAuth.mode || "",
    protocols: currentAuth.protocols,
    any_login: currentAuth.any_login,
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showAnyLogin = capabilities?.features.auth_any_login ?? false;
  const modeLabels = authModeLabels(t);

  const toggleProtocol = (protocol: string) => {
    setDraft((current) => ({
      ...current,
      protocols: current.protocols.includes(protocol)
        ? current.protocols.filter((p) => p !== protocol)
        : [...current.protocols, protocol],
    }));
  };

  const handleOpenChange = (next: boolean) => {
    if (!loading) onOpenChange(next);
  };

  const handleSubmit = async () => {
    const issue = authProblem(currentAuth, draft);
    if (issue) {
      setError(t(`auth.${issue.problem}`));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await pppoeServerService.updateAuthSettings(currentAuth, draft, showAnyLogin);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("auth.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            {t("auth.title")}
          </DialogTitle>
          <DialogDescription>{t("auth.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pppoe-auth-mode">{t("auth.mode")}</Label>
            <NamedListSelect
              id="pppoe-auth-mode"
              value={draft.mode}
              names={capabilities?.values.auth_modes || []}
              labels={modeLabels}
              onValueChange={(mode) => setDraft((current) => ({ ...current, mode }))}
              noneLabel={tc("default")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("auth.protocols")}</Label>
            <div className="space-y-1">
              {(capabilities?.values.auth_protocols || []).map((protocol) => (
                <div key={protocol} className="flex items-center gap-2">
                  <Checkbox
                    id={`proto-${protocol}`}
                    checked={draft.protocols.includes(protocol)}
                    onCheckedChange={() => toggleProtocol(protocol)}
                  />
                  <Label htmlFor={`proto-${protocol}`} className="cursor-pointer font-mono text-sm">{protocol}</Label>
                </div>
              ))}
            </div>
          </div>

          {showAnyLogin && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="pppoe-auth-any-login"
                checked={draft.any_login}
                onCheckedChange={(checked) => setDraft((current) => ({ ...current, any_login: checked === true }))}
              />
              <Label htmlFor="pppoe-auth-any-login" className="cursor-pointer text-sm">
                {t("auth.anyLogin")}
              </Label>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{tc("saving")}</> : tc("saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
