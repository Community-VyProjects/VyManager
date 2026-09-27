"use client";

import { useState, useEffect } from "react";
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
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import type { ArpEntry } from "@/lib/api/static-routes";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import {
  arpDraftFrom,
  emptyArpDraft,
  submitArpCreate,
  submitArpUpdate,
  validateArpCreate,
  validateArpEdit,
  type ArpDraft,
} from "./static-routes-form";

export interface ArpExisting {
  interface: string;
  entry: ArpEntry;
}

interface ArpEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existing?: ArpExisting | null;
}

export function ArpEntryModal({
  open,
  onOpenChange,
  onSuccess,
  existing,
}: ArpEntryModalProps) {
  const t = useTranslations("routingExtras");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [draft, setDraft] = useState<ArpDraft>(emptyArpDraft());

  useEffect(() => {
    if (!open) return;
    showService.getAllInterfaces().then((res) => setAvailableInterfaces(res.interfaces)).catch((err) => {
      console.error("Failed to load interfaces:", err);
    });
    if (existing) {
      setDraft(arpDraftFrom(existing.interface, existing.entry));
    } else {
      setDraft(emptyArpDraft());
    }
    setError(null);
  }, [open, existing]);

  const patch = (fields: Partial<ArpDraft>) => setDraft((d) => ({ ...d, ...fields }));
  const lockedInterface = lockedIdentity(existing, (e) => e.interface, draft.interfaceName);
  const lockedIp = lockedIdentity(existing, (e) => e.entry.ip_address, draft.ipAddress);

  const handleSubmit = async () => {
    const validationError = isEdit ? validateArpEdit(draft) : validateArpCreate(draft);
    if (validationError) {
      setError(t(`validation.${validationError}`));
      return;
    }

    const write = modalWriteKind(existing ? { name: existing.entry.ip_address } : null);
    setLoading(true);
    setError(null);

    try {
      const result =
        write.kind === "update" && existing
          ? await submitArpUpdate(
              { interfaceName: existing.interface, entry: existing.entry },
              draft,
            )
          : await submitArpCreate(draft);
      if (result && result.success === false) {
        setError(result.error || tc("operationFailed"));
        return;
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : isEdit ? t("arpModal.updateFailed") : t("arpModal.createFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="interface">{t("shared.interface")}</Label>
            {lockedInterface.disabled ? (
              <Input value={lockedInterface.value} disabled className="bg-muted" />
            ) : (
              <InterfaceSelect
                value={draft.interfaceName}
                onValueChange={(value) => patch({ interfaceName: value })}
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
              onChange={(e) => patch({ ipAddress: e.target.value })}
            />
            {isEdit && (
              <p className="text-xs text-muted-foreground">
                {t("arpModal.ipLocked")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mac-address">{t("arpModal.macAddress")}</Label>
            <Input
              id="mac-address"
              placeholder="00:11:22:33:44:55"
              value={draft.macAddress}
              onChange={(e) => patch({ macAddress: e.target.value })}
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
