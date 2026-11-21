"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { showService, type InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { staticRoutesService, type ArpEntry } from "@/lib/api/static-routes";
import {
  arpFields,
  arpProblem,
  type ArpFields,
  type ArpProblem,
} from "@/lib/api/static-routes-save-ops";
import { lockedIdentity, modalIsEdit } from "@/lib/modal-mode";
import type { ApiError } from "@/lib/types/api";

export interface ArpExisting {
  interface: string;
  entry: ArpEntry;
}

interface ArpEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existing?: ArpExisting | null;
  /** `interface|address` of every entry on the device. */
  configured: string[];
}

export function ArpEntryModal({
  open,
  onOpenChange,
  onSuccess,
  existing,
  configured,
}: ArpEntryModalProps) {
  const t = useTranslations("routingExtras");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);
  const initial = useMemo(
    () => arpFields(existing?.interface ?? "", existing?.entry),
    [existing],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [draft, setDraft] = useState<ArpFields>(initial);

  const seedKey = open ? JSON.stringify(initial) : "";
  const [seed, setSeed] = useState(seedKey);
  if (seedKey !== seed) {
    setSeed(seedKey);
    setDraft(initial);
    setError(null);
  }

  useEffect(() => {
    if (!open) return;
    let live = true;
    showService
      .getAllInterfaces()
      .then((res) => {
        if (live) setAvailableInterfaces(res.interfaces);
      })
      .catch(() => {
        if (live) setAvailableInterfaces([]);
      });
    return () => {
      live = false;
    };
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
  };

  const patch = (fields: Partial<ArpFields>) => setDraft((d) => ({ ...d, ...fields }));
  const lockedInterface = lockedIdentity(existing, (e) => e.interface, draft.interface);
  const lockedIp = lockedIdentity(existing, (e) => e.entry.ip_address, draft.address);

  const problemMessage = (problem: ArpProblem): string => {
    switch (problem.key) {
      case "arpEntryExists":
        return t("validation.arpEntryExists", { name: problem.name });
      case "descriptionTooLong":
        return t("validation.descriptionTooLong", { max: problem.max });
      default:
        return t(`validation.${problem.key}`);
    }
  };

  const handleSubmit = async () => {
    const original = isEdit ? initial : null;
    const problem = arpProblem(original, draft, configured);
    if (problem) {
      setError(problemMessage(problem));
      return;
    }
    const failed = isEdit ? t("arpModal.updateFailed") : t("arpModal.createFailed");
    setLoading(true);
    setError(null);
    try {
      const result = await staticRoutesService.saveArpEntry(original, draft);
      if (result && !result.success) {
        setError(result.error || failed);
        return;
      }
      if (result) onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).message || failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("arpModal.editTitle") : t("arpModal.createTitle")}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("arpModal.editDescription", { ip: existing.entry.ip_address, interface: existing.interface })
              : t("arpModal.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="interface">{t("shared.interface")}</Label>
            {lockedInterface.disabled ? (
              <Input value={lockedInterface.value} disabled className="bg-muted" />
            ) : (
              <InterfaceSelect
                value={draft.interface}
                onValueChange={(value) => patch({ interface: value })}
                interfaces={availableInterfaces}
                placeholder={t("shared.selectInterface")}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ip-address">{t("arpModal.ipAddress")}</Label>
            <Input
              id="ip-address"
              placeholder="192.168.1.100"
              value={lockedIp.value}
              disabled={lockedIp.disabled}
              className={lockedIp.disabled ? "bg-muted" : undefined}
              onChange={(e) => patch({ address: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mac-address">{t("arpModal.macAddress")}</Label>
            <Input
              id="mac-address"
              placeholder="00:11:22:33:44:55"
              value={draft.mac}
              onChange={(e) => patch({ mac: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("shared.descriptionOptional")}</Label>
            <Input
              id="description"
              placeholder={t("arpModal.descriptionPlaceholder")}
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? t("arpModal.updateEntry") : t("shared.createEntry")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
