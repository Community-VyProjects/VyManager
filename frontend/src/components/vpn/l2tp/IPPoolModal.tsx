"use client";

import { useState, useEffect } from "react";
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
import { AlertCircle, Loader2, Network } from "lucide-react";
import { l2tpService, L2TPClientIPPool } from "@/lib/api/l2tp";
import { ApiError } from "@/lib/types/api";

interface IPPoolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingPool: L2TPClientIPPool | null;
}

export function IPPoolModal({
  open,
  onOpenChange,
  onSuccess,
  existingPool,
}: IPPoolModalProps) {
  const t = useTranslations("l2tp");
  const tc = useTranslations("common");
  const isEdit = !!existingPool;

  const [name, setName] = useState("");
  const [range, setRange] = useState("");
  const [nextPool, setNextPool] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingPool) {
        setName(existingPool.name);
        setRange(existingPool.range || "");
        setNextPool(existingPool.next_pool || "");
      } else {
        setName("");
        setRange("");
        setNextPool("");
      }
      setError(null);
    }
  }, [open, existingPool]);

  const handleSubmit = async () => {
    if (!name.trim()) { setError(t("shared.poolNameRequired")); return; }

    setLoading(true);
    setError(null);

    try {
      if (isEdit) await l2tpService.deleteIPPool(existingPool!.name);

      const result = await l2tpService.createIPPool(name.trim(), {
        range: range || undefined,
        next_pool: nextPool || undefined,
      });

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("shared.saveFailedPool"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("shared.saveFailedPool"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            {isEdit ? t("ipPool.titleEdit") : t("ipPool.titleCreate")}
          </DialogTitle>
          <DialogDescription>{t("ipPool.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("shared.poolName")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="pool1" disabled={isEdit} />
          </div>
          <div className="space-y-2">
            <Label>{t("ipPool.range")}</Label>
            <Input value={range} onChange={(e) => setRange(e.target.value)} placeholder="10.255.0.2-10.255.0.254" />
            <p className="text-xs text-muted-foreground">{t("ipPool.rangeHelp")}</p>
          </div>
          <div className="space-y-2">
            <Label>{t("ipPool.nextPool")}</Label>
            <Input value={nextPool} onChange={(e) => setNextPool(e.target.value)} placeholder={t("ipPool.nextPoolPlaceholder")} />
            <p className="text-xs text-muted-foreground">{t("ipPool.nextPoolHelp")}</p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? tc("saving") : tc("creating")}</> : isEdit ? tc("saveChanges") : t("shared.createPool")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
