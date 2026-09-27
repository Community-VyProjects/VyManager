"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { staticRoutesService, type ArpEntry } from "@/lib/api/static-routes";

interface DeleteArpEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceName: string;
  entry: ArpEntry | null;
}

export function DeleteArpEntryModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceName,
  entry,
}: DeleteArpEntryModalProps) {
  const t = useTranslations("routingExtras");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!entry) return;

    setError(null);
    setLoading(true);

    try {
      await staticRoutesService.deleteArpEntry(interfaceName, entry.ip_address);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deleteArp.failed"));
    } finally {
      setLoading(false);
    }
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            {t("deleteArp.title")}
          </DialogTitle>
          <DialogDescription>
            {t("deleteArp.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2 mb-4">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{t("shared.interfaceColon")}</span>
              <span className="text-sm font-medium">{interfaceName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{t("shared.ipAddressColon")}</span>
              <span className="text-sm font-mono">{entry.ip_address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{t("deleteArp.macAddress")}</span>
              <span className="text-sm font-mono">{entry.mac_address}</span>
            </div>
            {entry.description && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{t("deleteArp.descriptionColon")}</span>
                <span className="text-sm">{entry.description}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {tc("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
