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
import { snmpService, SNMPScriptExtension } from "@/lib/api/snmp";

interface SNMPScriptExtensionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: SNMPScriptExtension | null;
  existingNames: string[];
  onSuccess: () => void;
}

export function SNMPScriptExtensionModal({
  open,
  onOpenChange,
  existing,
  existingNames,
  onSuccess,
}: SNMPScriptExtensionModalProps) {
  const t = useTranslations("snmp");
  const tc = useTranslations("common");
  const isEdit = existing !== null;
  const [name, setName] = useState(existing?.name ?? "");
  const [script, setScript] = useState(existing?.script ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const n = name.trim();
    if (!n) {
      setError(t("extension.nameRequired"));
      return;
    }
    if (!isEdit && existingNames.includes(n)) {
      setError(t("extension.exists", { name: n }));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await snmpService.saveScriptExtension(existing, { name: n, script });
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
          <DialogTitle>
            {isEdit ? t("extension.editTitle") : t("extension.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("extension.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="ext-name">{t("extension.name")}</Label>
            <Input
              id="ext-name"
              placeholder={t("extension.namePlaceholder")}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              disabled={isEdit}
              className={isEdit ? "font-mono bg-muted" : "font-mono"}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ext-script">{t("content.script")}</Label>
            <Input
              id="ext-script"
              placeholder={t("extension.scriptPlaceholder")}
              value={script}
              onChange={(e) => setScript(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {t.rich("extension.scriptHelp", {
                code: (chunks) => <span className="font-mono">{chunks}</span>,
              })}
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
