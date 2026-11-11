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
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2, Server } from "lucide-react";
import { ipsecService, RARadiusServer } from "@/lib/api/ipsec";
import { ApiError } from "@/lib/types/api";

interface RadiusServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingServer: RARadiusServer | null;
}

export function RadiusServerModal({
  open,
  onOpenChange,
  onSuccess,
  existingServer,
}: RadiusServerModalProps) {
  const t = useTranslations("ipsec");
  const tc = useTranslations("common");
  const isEdit = !!existingServer;

  const [address, setAddress] = useState("");
  const [key, setKey] = useState("");
  const [port, setPort] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [disableAccounting, setDisableAccounting] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAddress(existingServer?.address || "");
      setKey("");
      setPort(existingServer?.port || "");
      setDisabled(existingServer?.disabled || false);
      setDisableAccounting(existingServer?.disable_accounting || false);
      setError(null);
    }
  }, [open, existingServer]);

  const handleSubmit = async () => {
    if (!address.trim()) { setError(t("radiusModal.addressRequired")); return; }
    if (!isEdit && !key) { setError(t("radiusModal.keyRequired")); return; }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        key: key || undefined,
        port: port.trim() || undefined,
        disabled,
        disable_accounting: disableAccounting,
      };
      const result = isEdit && existingServer
        ? await ipsecService.updateRARadiusServer(existingServer.address, payload, existingServer)
        : await ipsecService.createRARadiusServer(address.trim(), payload);

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("radiusModal.saveFailed"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("radiusModal.saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            {isEdit ? t("radiusModal.titleEdit") : t("radiusModal.titleCreate")}
          </DialogTitle>
          <DialogDescription>{t("radiusModal.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("radiusModal.address")}</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="192.0.2.10" disabled={isEdit} />
          </div>
          <div className="space-y-2">
            <Label>{t("radiusModal.key")}</Label>
            <Input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder={isEdit ? t("radiusModal.keepCurrent") : undefined} />
          </div>
          <div className="space-y-2">
            <Label>{t("radiusModal.port")}</Label>
            <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder="1812" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="radius-disable" checked={disabled} onCheckedChange={(c) => setDisabled(c === true)} />
            <Label htmlFor="radius-disable" className="cursor-pointer text-sm">{tc("disabled")}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="radius-disable-accounting" checked={disableAccounting} onCheckedChange={(c) => setDisableAccounting(c === true)} />
            <Label htmlFor="radius-disable-accounting" className="cursor-pointer text-sm">{t("radiusModal.disableAccounting")}</Label>
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? tc("saving") : tc("creating")}</> : isEdit ? tc("saveChanges") : t("page.radius.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
