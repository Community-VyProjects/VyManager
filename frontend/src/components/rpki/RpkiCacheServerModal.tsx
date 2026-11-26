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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { AlertCircle, Loader2 } from "lucide-react";
import type { ApiError } from "@/lib/types/api";
import type { RpkiCacheServer, RpkiCapabilities } from "@/lib/api/rpki";
import {
  rpkiCacheFields,
  rpkiCacheProblem,
  rpkiRange,
  type RpkiCacheFields,
  type RpkiRangeKey,
} from "@/lib/api/rpki-save-ops";
import { useRpkiProblemText } from "./rpki-problem-text";

interface RpkiCacheServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Commits the save; a rejection keeps the dialog open with the device error. */
  onSubmit: (fields: RpkiCacheFields) => Promise<void>;
  existingServer: RpkiCacheServer | null;
  /** Every configured cache server (address and preference checks). */
  servers: RpkiCacheServer[];
  capabilities: RpkiCapabilities | null;
  /** `pki openssh` key names. */
  sshKeyNames: string[];
}

export function RpkiCacheServerModal({
  open,
  onOpenChange,
  onSubmit,
  existingServer,
  servers,
  capabilities,
  sshKeyNames,
}: RpkiCacheServerModalProps) {
  const t = useTranslations("rpki");
  const tc = useTranslations("common");
  const isEditMode = existingServer !== null;
  const sourceAddressSupported = capabilities?.features.cache_source_address.supported ?? false;

  // The page remounts this dialog on every open, so the draft starts from the loaded server.
  const [fields, setFields] = useState<RpkiCacheFields>(() => rpkiCacheFields(existingServer));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (next: Partial<RpkiCacheFields>) => setFields((prev) => ({ ...prev, ...next }));
  const problemText = useRpkiProblemText();

  const rangeText = (key: RpkiRangeKey) => {
    const range = rpkiRange(capabilities, key);
    return range ? `${range.min}-${range.max}` : "";
  };

  const handleOpenChange = (next: boolean) => {
    // A close while the commit runs would drop its error.
    if (!next && loading) return;
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    const problem = rpkiCacheProblem(fields, existingServer, servers, capabilities);
    if (problem) {
      setError(problemText(problem));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(fields);
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).message || t("errors.saveCache"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("modal.editTitle") : t("servers.add")}
          </DialogTitle>
          <DialogDescription>
            {t("modal.description")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-5 py-2">
            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="rpki-address">{t("modal.address")}</Label>
              <Input
                id="rpki-address"
                value={fields.address}
                onChange={(e) => patch({ address: e.target.value })}
                placeholder={t("modal.addressPlaceholder")}
                disabled={isEditMode || loading}
                className={isEditMode ? "bg-muted" : ""}
              />
            </div>

            {/* Connection Settings */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="rpki-port">{t("servers.port")}</Label>
                  <Input
                    id="rpki-port"
                    type="number"
                    min={rpkiRange(capabilities, "port")?.min}
                    max={rpkiRange(capabilities, "port")?.max}
                    value={fields.port}
                    onChange={(e) => patch({ port: e.target.value })}
                    placeholder={rangeText("port")}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rpki-preference">{t("servers.preference")}</Label>
                  <Input
                    id="rpki-preference"
                    type="number"
                    min={rpkiRange(capabilities, "preference")?.min}
                    max={rpkiRange(capabilities, "preference")?.max}
                    value={fields.preference}
                    onChange={(e) => patch({ preference: e.target.value })}
                    placeholder={rangeText("preference")}
                    disabled={loading}
                  />
                </div>
              </div>
              {sourceAddressSupported && (
                <div className="space-y-1.5">
                  <Label htmlFor="rpki-source-address">{t("servers.sourceAddress")}</Label>
                  <Input
                    id="rpki-source-address"
                    value={fields.sourceAddress}
                    onChange={(e) => patch({ sourceAddress: e.target.value })}
                    placeholder={t("modal.sourceAddressPlaceholder")}
                    disabled={loading}
                  />
                </div>
              )}
            </div>

            {/* SSH Transport */}
            <div className="rounded-md border border-border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="rpki-ssh-enabled"
                  checked={fields.sshEnabled}
                  onCheckedChange={(checked) => patch({ sshEnabled: checked === true })}
                  disabled={loading}
                />
                <Label htmlFor="rpki-ssh-enabled" className="cursor-pointer">
                  {t("modal.useSsh")}
                </Label>
              </div>

              {fields.sshEnabled && (
                <div className="pl-7 space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rpki-ssh-key">{t("modal.sshKey")}</Label>
                    <NamedListSelect
                      id="rpki-ssh-key"
                      value={fields.sshKey}
                      names={sshKeyNames}
                      onValueChange={(sshKey) => patch({ sshKey })}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rpki-ssh-username">{t("modal.sshUsername")}</Label>
                    <Input
                      id="rpki-ssh-username"
                      value={fields.sshUsername}
                      onChange={(e) => patch({ sshUsername: e.target.value })}
                      placeholder={t("modal.usernamePlaceholder")}
                      disabled={loading}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? tc("saving") : tc("creating")}
              </>
            ) : isEditMode ? (
              tc("saveChanges")
            ) : (
              t("servers.add")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
