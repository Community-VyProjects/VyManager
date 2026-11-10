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
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2 } from "lucide-react";
import { ntpService, NTPServer, NTPServerUpdate } from "@/lib/api/ntp";

interface NTPServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: NTPServer | null;
  existingNames: string[];
  onSuccess: () => void;
}

export function NTPServerModal({
  open,
  onOpenChange,
  existing,
  existingNames,
  onSuccess,
}: NTPServerModalProps) {
  const t = useTranslations("ntp");
  const tc = useTranslations("common");
  const isEdit = existing !== null;

  const [name, setName] = useState(existing?.name ?? "");
  const [pool, setPool] = useState(existing?.pool ?? false);
  const [prefer, setPrefer] = useState(existing?.prefer ?? false);
  const [nts, setNts] = useState(existing?.nts ?? false);
  const [noselect, setNoselect] = useState(existing?.noselect ?? false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    const trimmed = name.trim();
    if (!trimmed) return t("server.nameRequired");
    if (!isEdit && existingNames.includes(trimmed)) {
      return t("server.nameExists", { name: trimmed });
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const update: NTPServerUpdate = {
      name: name.trim(),
      pool,
      prefer,
      nts,
      noselect,
    };

    setSubmitting(true);
    setError(null);
    try {
      await ntpService.setServer(existing, update);
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
          <DialogTitle>{isEdit ? t("server.editTitle") : t("server.addTitle")}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("server.editDescription")
              : t("server.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-1">
            {/* Server name */}
            <div className="space-y-1.5">
              <Label htmlFor="server-name">{t("server.server")}</Label>
              <Input
                id="server-name"
                placeholder={t("server.namePlaceholder")}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                disabled={isEdit}
                className={isEdit ? "font-mono bg-muted" : ""}
              />
              <p className="text-xs text-muted-foreground">
                {t("server.nameHint")}
              </p>
            </div>

            <Separator />

            {/* Flags */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t("server.options")}</Label>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="flag-pool"
                    checked={pool}
                    onCheckedChange={(checked) => setPool(!!checked)}
                  />
                  <Label htmlFor="flag-pool" className="cursor-pointer leading-tight">
                    <span className="font-medium">{t("server.pool")}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {t("server.poolHint")}
                    </span>
                  </Label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="flag-prefer"
                    checked={prefer}
                    onCheckedChange={(checked) => setPrefer(!!checked)}
                  />
                  <Label htmlFor="flag-prefer" className="cursor-pointer leading-tight">
                    <span className="font-medium">{t("server.prefer")}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {t("server.preferHint")}
                    </span>
                  </Label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="flag-nts"
                    checked={nts}
                    onCheckedChange={(checked) => setNts(!!checked)}
                  />
                  <Label htmlFor="flag-nts" className="cursor-pointer leading-tight">
                    <span className="font-medium">NTS</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {t("server.ntsHint")}
                    </span>
                  </Label>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="flag-noselect"
                    checked={noselect}
                    onCheckedChange={(checked) => setNoselect(!!checked)}
                  />
                  <Label htmlFor="flag-noselect" className="cursor-pointer leading-tight">
                    <span className="font-medium">{t("server.noSelect")}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {t("server.noSelectHint")}
                    </span>
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

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
            {isEdit ? tc("save") : t("server.addServer")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
