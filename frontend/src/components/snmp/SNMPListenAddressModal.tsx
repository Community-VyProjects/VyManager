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
import { AlertCircle, Loader2 } from "lucide-react";
import { snmpService, SNMPListenAddress } from "@/lib/api/snmp";
import { isValidIP } from "./SNMPMultiValueField";

interface SNMPListenAddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: SNMPListenAddress | null;
  existingAddresses: string[];
  defaultPort: string;
  onSuccess: () => void;
}

export function SNMPListenAddressModal({
  open,
  onOpenChange,
  existing,
  existingAddresses,
  defaultPort,
  onSuccess,
}: SNMPListenAddressModalProps) {
  const t = useTranslations("snmp");
  const tc = useTranslations("common");
  const isEdit = existing !== null;
  const [address, setAddress] = useState(existing?.address ?? "");
  const [port, setPort] = useState(existing?.port ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const addr = address.trim();
    if (!addr) {
      setError(t("listen.addressRequired"));
      return;
    }
    if (!isValidIP(addr)) {
      setError(t("validation.invalidIp"));
      return;
    }
    if (!isEdit && existingAddresses.includes(addr)) {
      setError(t("listen.exists", { address: addr }));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await snmpService.saveListenAddress(existing, { address: addr, port });
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
            <Label htmlFor="listen-address">{t("listen.ipAddress")}</Label>
            <Input
              id="listen-address"
              placeholder={t("listen.addressPlaceholder")}
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
            <Label htmlFor="listen-port">{t("content.port")}</Label>
            <Input
              id="listen-port"
              type="number"
              min={1}
              max={65535}
              placeholder={t("general.defaultValue", { value: defaultPort })}
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t("listen.portHelp", { port: defaultPort })}
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
