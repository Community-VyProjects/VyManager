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
import { VrfSelect } from "@/components/ui/vrf-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { tftpServerService, TFTPServerListenAddress } from "@/lib/api/tftp-server";

interface TFTPServerListenAddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: TFTPServerListenAddress | null;
  existingAddresses: string[];
  onSuccess: () => void;
}

function isValidIP(value: string): boolean {
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /^[0-9a-fA-F:]+$/;
  return ipv4.test(value) || ipv6.test(value);
}

export function TFTPServerListenAddressModal({
  open,
  onOpenChange,
  existing,
  existingAddresses,
  onSuccess,
}: TFTPServerListenAddressModalProps) {
  const t = useTranslations("tftpServer");
  const tc = useTranslations("common");
  const isEdit = existing !== null;
  const [address, setAddress] = useState(existing?.address ?? "");
  const [vrf, setVrf] = useState(existing?.vrf ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const addr = address.trim();
    if (!addr) {
      setError(t("listen.addressRequired"));
      return;
    }
    if (!isValidIP(addr)) {
      setError(t("listen.addressInvalid"));
      return;
    }
    if (!isEdit && existingAddresses.includes(addr)) {
      setError(t("listen.addressExists", { address: addr }));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await tftpServerService.saveListenAddress(existing, { address: addr, vrf });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("listen.editTitle") : t("listen.addTitle")}</DialogTitle>
          <DialogDescription>
            {t("listen.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="tftp-listen-address">{t("listen.ipAddress")}</Label>
            <Input
              id="tftp-listen-address"
              placeholder={t("listen.ipAddressPlaceholder")}
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setError(null);
              }}
              disabled={isEdit}
              className={isEdit ? "font-mono bg-muted" : "font-mono"}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tftp-listen-vrf">VRF</Label>
            <VrfSelect
              id="tftp-listen-vrf"
              value={vrf}
              onValueChange={setVrf}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {t("listen.vrfHint")}
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? tc("save") : tc("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
