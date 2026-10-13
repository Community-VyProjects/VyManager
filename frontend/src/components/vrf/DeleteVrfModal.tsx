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
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { vrfService } from "@/lib/api/vrf";

interface DeleteVrfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vrfName: string;
  onDeleted: () => void;
}

export function DeleteVrfModal({
  open,
  onOpenChange,
  vrfName,
  onDeleted,
}: DeleteVrfModalProps) {
  const t = useTranslations("vrf");
  const tc = useTranslations("common");
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setConfirmation("");
      setError(null);
    }
    onOpenChange(isOpen);
  };

  const handleDelete = async () => {
    if (confirmation !== vrfName) return;

    setDeleting(true);
    setError(null);

    try {
      const result = await vrfService.deleteVrf(vrfName);
      if (!result.success) {
        throw new Error(result.error || t("delete.deleteFailed"));
      }
      setConfirmation("");
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("delete.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            {t("deleteVrf")}
          </DialogTitle>
          <DialogDescription>
            {t.rich("delete.description", {
              name: vrfName,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
            <p className="text-sm text-muted-foreground">
              {t.rich("delete.typeToConfirm", {
                name: vrfName,
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-name">{t("delete.vrfName")}</Label>
            <Input
              id="confirm-name"
              placeholder={vrfName}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={deleting}>
            {tc("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || confirmation !== vrfName}
          >
            {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("deleteVrf")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
