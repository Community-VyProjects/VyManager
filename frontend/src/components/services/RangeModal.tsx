"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Network, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { type DHCPRange, type DHCPSharedNetwork } from "@/lib/api/dhcp";
import { ApiError } from "@/lib/types/api";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import {
  emptyRangeDraft,
  nextRangeId,
  rangeDraftFrom,
  submitRangeCreate,
  submitRangeUpdate,
  validateRangeCreate,
  validateRangeShared,
  type RangeDraft,
} from "./dhcp-form";

interface RangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  network: DHCPSharedNetwork;
  existing?: { subnet: string; range: DHCPRange } | null;
}

export function RangeModal({
  open,
  onOpenChange,
  onSuccess,
  network,
  existing,
}: RangeModalProps) {
  const t = useTranslations("dhcpServer");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);
  const [draft, setDraft] = useState<RangeDraft>(emptyRangeDraft());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setDraft(rangeDraftFrom(existing.subnet, existing.range));
    } else {
      const next = emptyRangeDraft();
      if (network.subnets.length === 1) {
        next.subnet = network.subnets[0].subnet;
      }
      setDraft(next);
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing]);

  const patch = (fields: Partial<RangeDraft>) =>
    setDraft((current) => ({ ...current, ...fields }));

  const lockedSubnet = lockedIdentity(existing, (record) => record.subnet, draft.subnet);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const validationError = isEdit
      ? validateRangeShared(draft)
      : validateRangeCreate(draft);
    if (validationError) {
      setError(t(validationError));
      return;
    }

    const write = modalWriteKind(existing ? { name: existing.range.range_id } : null);
    setLoading(true);
    setError(null);

    try {
      if (write.kind === "update" && existing) {
        await submitRangeUpdate(network.name, existing, draft);
      } else {
        await submitRangeCreate(
          network.name,
          draft,
          nextRangeId(network, draft.subnet),
        );
      }
      handleClose();
      onSuccess();
    } catch (err) {
      setError(
        (err as ApiError).message ||
          (isEdit ? t("range.updateFailed") : t("range.createFailed")),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {isEdit ? t("range.editTitle") : t("range.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("range.editDescription")
              : t("range.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <Network className="h-4 w-4" />
            <span>
              {t("networkLabel")}{" "}
              <span className="font-medium text-foreground">{network.name}</span>
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subnet">{t("subnet")}</Label>
            <Select
              value={lockedSubnet.value}
              onValueChange={(value) => patch({ subnet: value })}
              disabled={lockedSubnet.disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectSubnet")} />
              </SelectTrigger>
              <SelectContent>
                {network.subnets.map((subnet) => (
                  <SelectItem key={subnet.subnet} value={subnet.subnet}>
                    {subnet.subnet}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {isEdit
                ? t("subnetLocked")
                : t("range.subnetHelp")}
            </p>
          </div>

          {isEdit && existing && (
            <div className="space-y-2">
              <Label>{t("range.rangeId")}</Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">
                  {existing.range.range_id}
                </Badge>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="start-ip">{t("range.startIp")}</Label>
            <Input
              id="start-ip"
              placeholder={t("examplePlaceholder", { example: "192.168.1.100" })}
              value={draft.startIp}
              onChange={(e) => patch({ startIp: e.target.value })}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {t("range.startIpHelp")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stop-ip">{t("range.stopIp")}</Label>
            <Input
              id="stop-ip"
              placeholder={t("examplePlaceholder", { example: "192.168.1.200" })}
              value={draft.stopIp}
              onChange={(e) => patch({ stopIp: e.target.value })}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {t("range.stopIpHelp")}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading
              ? isEdit
                ? tc("saving")
                : t("creating")
              : isEdit
                ? t("saveChanges")
                : t("range.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
