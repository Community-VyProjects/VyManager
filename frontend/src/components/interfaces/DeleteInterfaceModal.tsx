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
import { Loader2, AlertTriangle } from "lucide-react";

interface DeleteInterfaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  interfaceName: string;
}

export function DeleteInterfaceModal({
  isOpen,
  onClose,
  onConfirm,
  interfaceName,
}: DeleteInterfaceModalProps) {
  const t = useTranslations("sharedMisc");
  const tc = useTranslations("common");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Failed to delete interface:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>{t("deleteInterface.title")}</DialogTitle>
            </div>
          </div>
          <DialogDescription className="pt-3">
            {t.rich("deleteInterface.description", {
              name: interfaceName,
              iface: (chunks) => <span className="font-mono font-semibold text-foreground">{chunks}</span>,
            })}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isDeleting}>
            {tc("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("deleteInterface.title")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
