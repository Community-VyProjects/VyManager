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
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, Network, X } from "lucide-react";
import { ipoeServerService, IPoEClientIPPool } from "@/lib/api/ipoe-server";
import { ApiError } from "@/lib/types/api";

interface IPPoolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingPool: IPoEClientIPPool | null;
}

export function IPPoolModal({ open, onOpenChange, onSuccess, existingPool }: IPPoolModalProps) {
  const t = useTranslations("ipoeServer");
  const tc = useTranslations("common");
  const isEdit = !!existingPool;

  const [name, setName] = useState("");
  const [ranges, setRanges] = useState<string[]>([]);
  const [rangeInput, setRangeInput] = useState("");
  const [nextPool, setNextPool] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingPool) {
        setName(existingPool.name);
        setRanges(existingPool.ranges || []);
        setNextPool(existingPool.next_pool || "");
      } else {
        setName("");
        setRanges([]);
        setNextPool("");
      }
      setRangeInput("");
      setError(null);
    }
  }, [open, existingPool]);

  const addRange = () => {
    const val = rangeInput.trim();
    if (val && !ranges.includes(val)) {
      setRanges([...ranges, val]);
      setRangeInput("");
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError(t("poolNameRequired")); return; }

    setLoading(true);
    setError(null);

    try {
      let result;
      if (isEdit) {
        result = await ipoeServerService.updateIPPool(existingPool!.name, existingPool!, ranges, nextPool || undefined);
      } else {
        result = await ipoeServerService.createIPPool(name.trim(), ranges, nextPool || undefined);
      }

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("ipPoolModal.saveFailed"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("ipPoolModal.saveFailed"));
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
            {isEdit ? t("ipPoolModal.editTitle") : t("ipPoolModal.createTitle")}
          </DialogTitle>
          <DialogDescription>{t("ipPoolModal.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("poolName")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="pool1" disabled={isEdit} />
          </div>

          <div className="space-y-2">
            <Label>{t("ipPoolModal.ranges")}</Label>
            <div className="flex gap-2">
              <Input
                value={rangeInput}
                onChange={(e) => setRangeInput(e.target.value)}
                placeholder={t("ipPoolModal.rangePlaceholder")}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRange(); } }}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addRange}>{tc("add")}</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {ranges.map((r) => (
                <Badge key={r} variant="secondary" className="gap-1 font-mono text-xs">
                  {r}
                  <button onClick={() => setRanges(ranges.filter((x) => x !== r))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("ipPoolModal.nextPool")}</Label>
            <Input value={nextPool} onChange={(e) => setNextPool(e.target.value)} placeholder="pool2" />
            <p className="text-xs text-muted-foreground">{t("ipPoolModal.nextPoolHelp")}</p>
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? tc("saving") : tc("creating")}</> : isEdit ? tc("saveChanges") : t("createPool")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
