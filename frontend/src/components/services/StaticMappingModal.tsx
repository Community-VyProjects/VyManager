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
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Monitor, Network, Plus } from "lucide-react";
import {
  type DHCPCapabilitiesResponse,
  type DHCPSharedNetwork,
  type DHCPStaticMapping,
} from "@/lib/api/dhcp";
import { ApiError } from "@/lib/types/api";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import {
  emptyMappingDraft,
  mappingDraftFrom,
  submitMappingCreate,
  submitMappingUpdate,
  validateMappingCreate,
  validateMappingShared,
  type MappingDraft,
} from "./dhcp-form";

interface StaticMappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  network: DHCPSharedNetwork;
  capabilities?: DHCPCapabilitiesResponse | null;
  existing?: {
    network: string;
    subnet: string;
    mapping: DHCPStaticMapping;
  } | null;
}

export function StaticMappingModal({
  open,
  onOpenChange,
  onSuccess,
  network,
  capabilities,
  existing,
}: StaticMappingModalProps) {
  const t = useTranslations("dhcpServer");
  const tc = useTranslations("common");
  const isEdit = modalIsEdit(existing);
  const [draft, setDraft] = useState<MappingDraft>(emptyMappingDraft());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setDraft(mappingDraftFrom(existing.subnet, existing.mapping));
    } else {
      const next = emptyMappingDraft();
      if (network.subnets.length === 1) {
        next.subnet = network.subnets[0].subnet;
      }
      setDraft(next);
    }
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing]);

  const patch = (fields: Partial<MappingDraft>) =>
    setDraft((current) => ({ ...current, ...fields }));

  const lockedName = lockedIdentity(existing, (record) => record.mapping.name, draft.name);
  const lockedSubnet = lockedIdentity(existing, (record) => record.subnet, draft.subnet);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const canDuid = capabilities?.fields.static_mapping_duid?.supported ?? false;
    const validationError = isEdit
      ? validateMappingShared(draft)
      : validateMappingCreate(draft, canDuid);
    if (validationError) {
      setError(t(validationError));
      return;
    }

    const write = modalWriteKind(existing ? { name: existing.mapping.name } : null);
    setLoading(true);
    setError(null);

    try {
      if (write.kind === "update" && existing) {
        await submitMappingUpdate(existing, draft);
      } else {
        await submitMappingCreate(network.name, draft);
      }
      handleClose();
      onSuccess();
    } catch (err) {
      setError(
        (err as ApiError).message ||
          (isEdit
            ? t("mapping.updateFailed")
            : t("mapping.createFailed")),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? (
              <Monitor className="h-5 w-5" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
            {isEdit ? t("mapping.editTitle") : t("mapping.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("mapping.editDescription")
              : t("mapping.addDescription")}
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
                : t("mapping.subnetHelp")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mapping-name">{t("mapping.name")}</Label>
            <Input
              id="mapping-name"
              placeholder={t("mapping.namePlaceholder")}
              value={lockedName.value}
              onChange={(e) => patch({ name: e.target.value })}
              disabled={lockedName.disabled}
              className={isEdit ? "bg-muted" : undefined}
            />
            <p className="text-xs text-muted-foreground">
              {isEdit
                ? t("mapping.nameLocked")
                : t("mapping.nameHelp")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ip-address">{t("mapping.ipAddress")}</Label>
            <Input
              id="ip-address"
              placeholder={t("examplePlaceholder", { example: "192.168.1.100" })}
              value={draft.ipAddress}
              onChange={(e) => patch({ ipAddress: e.target.value })}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {t("mapping.ipHelp")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mac-address">{t("mapping.macAddress")}</Label>
            <Input
              id="mac-address"
              placeholder={t("examplePlaceholder", { example: "AA:BB:CC:DD:EE:FF" })}
              value={draft.macAddress}
              onChange={(e) =>
                patch({
                  macAddress: isEdit
                    ? e.target.value
                    : e.target.value.toUpperCase(),
                })
              }
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {t("mapping.macHelp")}
            </p>
          </div>

          {capabilities?.fields.static_mapping_duid?.supported && (
            <div className="space-y-2">
              <Label htmlFor="duid">DUID</Label>
              <Input
                id="duid"
                placeholder={t("examplePlaceholder", { example: "00:01:00:01:2a:3b:4c:5d:6e:7f" })}
                value={draft.duid}
                onChange={(e) => patch({ duid: e.target.value })}
                className="font-mono"
              />
              {!isEdit && (
                <p className="text-xs text-muted-foreground">
                  {t("mapping.duidHelp")}
                </p>
              )}
            </div>
          )}

          {isEdit && (
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <Checkbox
                id="disabled"
                checked={draft.disabled}
                onCheckedChange={(checked) =>
                  patch({ disabled: checked === true })
                }
              />
              <div className="space-y-0.5">
                <Label htmlFor="disabled" className="cursor-pointer">
                  {t("mapping.disable")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("mapping.disableHelp")}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="mapping-description">{tc("description")}</Label>
            <Input
              id="mapping-description"
              placeholder={t("optionalDescription")}
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
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
                : t("mapping.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
