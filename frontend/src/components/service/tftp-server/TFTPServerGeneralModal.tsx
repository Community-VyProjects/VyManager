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
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  tftpServerService,
  TFTPServerConfig,
  TFTPServerCapabilities,
  TFTPServerGeneralUpdate,
} from "@/lib/api/tftp-server";

interface TFTPServerGeneralModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: TFTPServerConfig;
  capabilities: TFTPServerCapabilities;
  onSuccess: () => void;
}

export function TFTPServerGeneralModal({
  open,
  onOpenChange,
  config,
  capabilities,
  onSuccess,
}: TFTPServerGeneralModalProps) {
  const t = useTranslations("tftpServer");
  const tc = useTranslations("common");
  const [directory, setDirectory] = useState(config.directory ?? "");
  const [allowUpload, setAllowUpload] = useState(config.allow_upload);
  const [port, setPort] = useState(config.port ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!directory.trim()) {
      setError(t("general.directoryRequired"));
      return;
    }
    setSubmitting(true);
    setError(null);
    const update: TFTPServerGeneralUpdate = {
      original: config,
      directory,
      allowUpload,
      port,
    };
    try {
      await tftpServerService.updateGeneral(update);
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
          <DialogTitle>{t("general.title")}</DialogTitle>
          <DialogDescription>
            {t("general.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="tftp-directory">{t("general.directory")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("general.directoryHint")}
            </p>
            <Input
              id="tftp-directory"
              placeholder={t("general.directoryPlaceholder")}
              value={directory}
              onChange={(e) => {
                setDirectory(e.target.value);
                setError(null);
              }}
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tftp-port">{t("general.port")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("general.portHint", { value: String(capabilities.features.port.default) })}
            </p>
            <Input
              id="tftp-port"
              type="number"
              min={1}
              max={65535}
              placeholder={t("content.defaultPort", { value: String(capabilities.features.port.default) })}
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
          </div>

          <Separator />

          <div className="flex items-start gap-3">
            <Checkbox
              id="tftp-allow-upload"
              checked={allowUpload}
              onCheckedChange={(c) => setAllowUpload(!!c)}
            />
            <Label htmlFor="tftp-allow-upload" className="cursor-pointer leading-tight">
              <span className="font-medium">{t("general.allowUploads")}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                {t("general.allowUploadsHint")}
              </span>
            </Label>
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
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
