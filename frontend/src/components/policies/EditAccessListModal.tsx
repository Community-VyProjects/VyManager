"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, ListFilter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { accessListService, type AccessList } from "@/lib/api/access-list";

interface EditAccessListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  accessList: AccessList | null;
}

export function EditAccessListModal({ open, onOpenChange, onSuccess, accessList }: EditAccessListModalProps) {
  const t = useTranslations("accessList");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open && accessList) {
      setDescription(accessList.description || "");
    }
  }, [open, accessList]);

  const handleClose = () => {
    setError(null);
    setDescription("");
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!accessList) return;

    setLoading(true);
    setError(null);

    try {
      await accessListService.updateAccessListDescription(
        accessList.number,
        accessList.list_type,
        description || null
      );
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("edit.failed"));
    } finally {
      setLoading(false);
    }
  };

  if (!accessList) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("edit.title")}</DialogTitle>
          <DialogDescription>
            {t("edit.description")}
          </DialogDescription>
        </DialogHeader>

        {/* Access List Details */}
        <div className="space-y-4 py-4">
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-sm font-medium">{accessList.number}</span>
              <Badge variant="outline">
                {accessList.list_type.toUpperCase()}
              </Badge>
              <Badge variant="secondary">
                {t("ruleCount", { count: accessList.rules.length })}
              </Badge>
            </div>
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description">{tc("description")}</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("create.descriptionPlaceholder")}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              {t("edit.leaveEmpty")}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t("edit.updating") : t("edit.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
