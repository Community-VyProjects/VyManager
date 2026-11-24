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
import { AlertCircle, Loader2, Server } from "lucide-react";
import { pppoeServerService, PPPoERadiusServer } from "@/lib/api/pppoe-server";
import { PPPOE_RANGES, radiusServerProblem, type PPPoERadiusServerDraft } from "@/lib/api/pppoe-server-save-ops";
import type { ApiError } from "@/lib/types/api";

interface RadiusServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingServer: PPPoERadiusServer | null;
  /** Configured server addresses; Add rejects them. */
  configuredServers: string[];
}

export function RadiusServerModal({ open, onOpenChange, onSuccess, existingServer, configuredServers }: RadiusServerModalProps) {
  const t = useTranslations("pppoeServerSettings");
  const tc = useTranslations("common");
  const isEdit = !!existingServer;
  // The page remounts this modal (key) on every open, so state seeds from props.
  // The key is required, so it loads blank: blank keeps the stored one.
  const [draft, setDraft] = useState<PPPoERadiusServerDraft>(() => ({
    address: existingServer?.address || "",
    key: "",
    port: existingServer?.port || "",
    acct_port: existingServer?.acct_port || "",
    priority: existingServer?.priority || "",
    fail_time: existingServer?.fail_time || "",
    disabled: existingServer?.disabled || false,
    backup: existingServer?.backup || false,
    disable_accounting: existingServer?.disable_accounting || false,
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<PPPoERadiusServerDraft>) => setDraft((current) => ({ ...current, ...patch }));

  const handleOpenChange = (next: boolean) => {
    if (!loading) onOpenChange(next);
  };

  const handleSubmit = async () => {
    const issue = radiusServerProblem(existingServer, draft, configuredServers);
    if (issue) {
      setError(t(`radiusServer.${issue.problem}`, issue.params));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await pppoeServerService.saveRadiusServer(existingServer, draft);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("radiusServer.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  const { port, radiusPriority: priority, radiusFailTime: failTime } = PPPOE_RANGES;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            {isEdit ? t("radiusServer.editTitle") : t("radiusServer.addTitle")}
          </DialogTitle>
          <DialogDescription>{t("radiusServer.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pppoe-srv-address">{t("radiusServer.address")}</Label>
            <Input
              id="pppoe-srv-address"
              value={draft.address}
              onChange={(e) => update({ address: e.target.value })}
              placeholder="10.0.0.100"
              disabled={isEdit}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pppoe-srv-key">{t("radiusServer.sharedKey")}</Label>
            <Input
              id="pppoe-srv-key"
              type="password"
              autoComplete="new-password"
              value={draft.key}
              onChange={(e) => update({ key: e.target.value })}
              placeholder={existingServer?.key ? t("leaveBlankToKeep") : t("radiusServer.enterSharedKey")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pppoe-srv-port">{t("radiusServer.authPort")}</Label>
              <Input
                id="pppoe-srv-port"
                type="number"
                min={port.min}
                max={port.max}
                value={draft.port}
                onChange={(e) => update({ port: e.target.value })}
                placeholder="1812"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pppoe-srv-acct-port">{t("radiusServer.acctPort")}</Label>
              <Input
                id="pppoe-srv-acct-port"
                type="number"
                min={port.min}
                max={port.max}
                value={draft.acct_port}
                onChange={(e) => update({ acct_port: e.target.value })}
                placeholder="1813"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pppoe-srv-priority">{t("radiusServer.priority")}</Label>
              <Input
                id="pppoe-srv-priority"
                type="number"
                min={priority.min}
                max={priority.max}
                value={draft.priority}
                onChange={(e) => update({ priority: e.target.value })}
                placeholder={`${priority.min}-${priority.max}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pppoe-srv-fail-time">{t("radiusServer.failTime")}</Label>
              <Input
                id="pppoe-srv-fail-time"
                type="number"
                min={failTime.min}
                max={failTime.max}
                value={draft.fail_time}
                onChange={(e) => update({ fail_time: e.target.value })}
                placeholder={`${failTime.min}-${failTime.max}`}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox id="srv-disabled" checked={draft.disabled} onCheckedChange={(v) => update({ disabled: !!v })} />
              <Label htmlFor="srv-disabled" className="cursor-pointer">{tc("disabled")}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="srv-backup" checked={draft.backup} onCheckedChange={(v) => update({ backup: !!v })} />
              <Label htmlFor="srv-backup" className="cursor-pointer">{t("radiusServer.backup")}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="srv-no-acct"
                checked={draft.disable_accounting}
                onCheckedChange={(v) => update({ disable_accounting: !!v })}
              />
              <Label htmlFor="srv-no-acct" className="cursor-pointer">{t("radiusServer.disableAccounting")}</Label>
            </div>
          </div>
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? tc("saving") : t("adding")}</> : isEdit ? tc("saveChanges") : t("radiusServer.addServer")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
