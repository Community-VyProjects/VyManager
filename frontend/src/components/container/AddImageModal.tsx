"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Starts the pull; its progress and result show in the command output dialog. */
  onSubmit: (imageRef: string) => void;
}

export function AddImageModal({ open, onOpenChange, onSubmit }: Props) {
  const t = useTranslations("containerResources");
  const tm = useTranslations("containers");
  const tc = useTranslations("common");
  const [imageRef, setImageRef] = useState("");

  const handleSubmit = () => {
    const ref = imageRef.trim();
    if (!ref) return;
    onOpenChange(false);
    onSubmit(ref);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("images.addImage")}</DialogTitle>
          <DialogDescription>{t("addImage.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="image-ref">{tm("modal.image")}</Label>
          <Input
            id="image-ref"
            value={imageRef}
            onChange={(e) => setImageRef(e.target.value)}
            placeholder={t("addImage.placeholder")}
            className="font-mono"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!imageRef.trim()}>
            {t("images.addImage")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
