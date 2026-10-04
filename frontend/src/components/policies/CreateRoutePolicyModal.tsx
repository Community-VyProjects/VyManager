"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle } from "lucide-react";
import { routeService } from "@/lib/api/route";
import { ApiError } from "@/lib/types/api";
import { useTranslations } from "next-intl";

interface CreateRoutePolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  policyType: string;
}

export function CreateRoutePolicyModal({
  open,
  onOpenChange,
  onSuccess,
  policyType,
}: CreateRoutePolicyModalProps) {
  const t = useTranslations("routePolicy.createPolicy");
  const tc = useTranslations("common");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultLog, setDefaultLog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError(t("nameRequired"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await routeService.createPolicy(
        policyType,
        name.trim(),
        description.trim() || undefined,
        defaultLog
      );
      handleClose();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("createFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setDefaultLog(false);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title", { family: policyType === "route" ? "IPv4" : "IPv6" })}</DialogTitle>
          <DialogDescription>
            {t("description", { policyType, family: policyType === "route" ? "IPv4" : "IPv6" })}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("nameLabel")}</Label>
            <Input
              id="name"
              placeholder="MY-POLICY"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{tc("description")}</Label>
            <Input
              id="description"
              placeholder={t("descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="defaultLog"
              checked={defaultLog}
              onCheckedChange={(checked) => setDefaultLog(checked as boolean)}
              disabled={loading}
            />
            <Label htmlFor="defaultLog" className="text-sm font-normal cursor-pointer">
              {t("defaultLog")}
            </Label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? tc("creating") : t("submit")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
